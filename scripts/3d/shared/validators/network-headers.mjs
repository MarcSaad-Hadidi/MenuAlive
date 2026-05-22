import { PRODUCTION_3D_BUDGETS, formatBytes } from "../budgets.mjs";
import { addFail, createValidationResult } from "./file-exists.mjs";

function absoluteUrl(baseUrl, pathOrUrl) {
  return new URL(pathOrUrl, `${baseUrl.replace(/\/+$/, "")}/`).toString();
}

function headerIncludes(headers, name, expected) {
  return (headers.get(name) ?? "").toLowerCase().includes(expected.toLowerCase());
}

function parseContentLength(response, method) {
  if (method === "GET" && response.status === 206) {
    const contentRange = response.headers.get("content-range") ?? "";
    const match = contentRange.match(/\/(\d+)$/);
    if (match) return Number(match[1]);
  }
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > 0 ? contentLength : 0;
}

async function cancelBody(response) {
  try {
    await response.body?.cancel?.();
  } catch {
    // Best-effort body cancellation only; validation continues from headers.
  }
}

async function fetchHeaders(url, fetchImpl) {
  let response = await fetchImpl(url, { method: "HEAD", redirect: "manual" });
  if (response.status !== 405) {
    return {
      response,
      method: "HEAD",
      contentLength: parseContentLength(response, "HEAD")
    };
  }

  response = await fetchImpl(url, {
    method: "GET",
    headers: { Range: "bytes=0-0" },
    redirect: "manual"
  });
  const contentLength = parseContentLength(response, "GET");
  await cancelBody(response);
  return {
    response,
    method: "GET",
    contentLength
  };
}

function expectedForAsset(asset) {
  const pathname = new URL(asset.url, "http://local").pathname.toLowerCase();
  if (pathname.endsWith(".glb")) {
    return {
      contentType: "model/gltf-binary",
      cache: ["public", "max-age=31536000", "immutable"]
    };
  }
  if (pathname.endsWith(".usdz")) {
    return {
      contentType: "model/vnd.usdz+zip",
      contentDisposition: "inline",
      cache: ["public", "max-age=31536000", "immutable"]
    };
  }
  return {
    cache: ["public", "max-age=31536000", "immutable"]
  };
}

async function validateRoute(route, baseUrl, fetchImpl, result) {
  const url = absoluteUrl(baseUrl, route);
  const { response, method } = await fetchHeaders(url, fetchImpl);
  const metric = { route, url, method, status: response.status };
  result.metrics.routes.push(metric);
  result.evidence.push(metric);
  if (response.status >= 400) {
    addFail(result, `${route}: status ${response.status}`);
  }
}

async function validateAsset(asset, baseUrl, fetchImpl, result) {
  const url = absoluteUrl(baseUrl, asset.url);
  const { response, method, contentLength } = await fetchHeaders(url, fetchImpl);
  const expected = expectedForAsset(asset);
  const metric = {
    label: asset.label ?? asset.url,
    role: asset.role ?? "",
    url,
    method,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    contentDisposition: response.headers.get("content-disposition") ?? "",
    cacheControl: response.headers.get("cache-control") ?? "",
    contentLength
  };
  result.metrics.assets.push(metric);
  result.evidence.push(metric);

  if (response.status >= 300 && response.status < 400) {
    addFail(result, `${metric.label}: redirect status ${response.status}`);
    return;
  }
  if (response.status >= 400) {
    addFail(result, `${metric.label}: status ${response.status}`);
    return;
  }

  if (expected.contentType && !headerIncludes(response.headers, "content-type", expected.contentType)) {
    addFail(
      result,
      `${metric.label}: content-type expected ${expected.contentType}, got ${metric.contentType || "(missing)"}`
    );
  }
  if (
    expected.contentDisposition &&
    !headerIncludes(response.headers, "content-disposition", expected.contentDisposition)
  ) {
    addFail(
      result,
      `${metric.label}: content-disposition expected ${expected.contentDisposition}, got ${metric.contentDisposition || "(missing)"}`
    );
  }
  for (const expectedCache of expected.cache ?? []) {
    if (!headerIncludes(response.headers, "cache-control", expectedCache)) {
      addFail(
        result,
        `${metric.label}: cache-control expected ${expectedCache}, got ${metric.cacheControl || "(missing)"}`
      );
    }
  }

  if (asset.productionQuickLook || asset.role === "iosUsdz") {
    const budget = PRODUCTION_3D_BUDGETS.variants.iosUsdz.bytes.fail;
    if (!contentLength) {
      addFail(result, `${metric.label}: missing Content-Length/Content-Range for production Quick Look`);
    } else if (contentLength > budget) {
      addFail(
        result,
        `${metric.label}: network size ${formatBytes(contentLength)} exceeds iOS Quick Look fail budget ${formatBytes(budget)}`
      );
    }
  }
}

export async function validateNetworkHeaders({
  baseUrl,
  routes = [],
  assets = [],
  fetchImpl = globalThis.fetch
} = {}) {
  const result = createValidationResult({
    name: "network-headers",
    metrics: {
      baseUrl,
      routes: [],
      assets: []
    }
  });

  if (!baseUrl) return addFail(result, "baseUrl is required");
  if (typeof fetchImpl !== "function") return addFail(result, "fetch implementation is required");

  for (const route of routes) {
    await validateRoute(route, baseUrl, fetchImpl, result);
  }
  for (const asset of assets) {
    await validateAsset(asset, baseUrl, fetchImpl, result);
  }

  return result;
}
