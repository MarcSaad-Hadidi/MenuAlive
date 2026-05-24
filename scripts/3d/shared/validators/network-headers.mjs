import { PRODUCTION_3D_BUDGETS, formatBytes } from "../budgets.mjs";
import { addFail, addWarning, createValidationResult } from "./file-exists.mjs";

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

function isSafeManifestAssetUrl(url) {
  return (
    typeof url === "string" &&
    url.startsWith("/") &&
    !url.startsWith("//") &&
    !url.includes("\\") &&
    !url.includes("..") &&
    !/^(?:javascript|data|file|https?):/i.test(url)
  );
}

async function cancelBody(response) {
  try {
    await response.body?.cancel?.();
  } catch {
    // Header validation can proceed even if body cancellation is unsupported.
  }
}

async function fetchHeaders(url, fetchImpl) {
  let response = await fetchImpl(url, { method: "HEAD", redirect: "manual" });
  if (response.status !== 405) {
    const headContentLength = parseContentLength(response, "HEAD");
    if (headContentLength > 0) {
      return {
        response,
        method: "HEAD",
        contentLength: headContentLength,
        rangeIgnored: false
      };
    }
    const pathname = new URL(url).pathname.toLowerCase();
    if (!pathname.endsWith(".usdz")) {
      return {
        response,
        method: "HEAD",
        contentLength: 0,
        rangeIgnored: false
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
      contentLength,
      rangeIgnored: response.status === 200
    };
  }

  response = await fetchImpl(url, {
    method: "GET",
    headers: { Range: "bytes=0-0" },
    redirect: "manual"
  });
  const method = "GET";
  const contentLength = parseContentLength(response, method);
  await cancelBody(response);
  return {
    response,
    method,
    contentLength,
    rangeIgnored: response.status === 200
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

async function validateAsset(asset, baseUrl, fetchImpl, result, strict) {
  const label = asset.label ?? asset.url;
  let response;
  let method;
  let contentLength;
  let rangeIgnored;
  if (!isSafeManifestAssetUrl(asset.url)) {
    addFail(result, `${label}: unsafe manifest asset URL`, { url: asset.url });
    return;
  }
  const url = absoluteUrl(baseUrl, asset.url);

  try {
    ({ response, method, contentLength, rangeIgnored } = await fetchHeaders(url, fetchImpl));
  } catch (error) {
    addFail(result, `${label}: network error: ${error.message}`, { url });
    return;
  }

  const expected = expectedForAsset(asset);
  const metric = {
    label,
    role: asset.role ?? "",
    url,
    method,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    contentDisposition: response.headers.get("content-disposition") ?? "",
    cacheControl: response.headers.get("cache-control") ?? "",
    contentLength,
    rangeIgnored
  };
  result.metrics.assets.push(metric);
  result.evidence.push(metric);

  if (rangeIgnored) {
    const message = `${label}: server ignored Range fallback and returned 200`;
    if (strict) addFail(result, message, metric);
    else addWarning(result, message, metric);
  }
  if (response.status >= 300 && response.status < 400) {
    addFail(result, `${label}: redirect status ${response.status}`, metric);
    return;
  }
  if (response.status >= 400) {
    addFail(result, `${label}: status ${response.status}`, metric);
    return;
  }

  if (expected.contentType && !headerIncludes(response.headers, "content-type", expected.contentType)) {
    addFail(result, `${label}: content-type expected ${expected.contentType}, got ${metric.contentType || "(missing)"}`, metric);
  }
  if (
    expected.contentDisposition &&
    !headerIncludes(response.headers, "content-disposition", expected.contentDisposition)
  ) {
    addFail(
      result,
      `${label}: content-disposition expected ${expected.contentDisposition}, got ${metric.contentDisposition || "(missing)"}`,
      metric
    );
  }
  for (const expectedCache of expected.cache ?? []) {
    if (!headerIncludes(response.headers, "cache-control", expectedCache)) {
      addFail(result, `${label}: cache-control expected ${expectedCache}, got ${metric.cacheControl || "(missing)"}`, metric);
    }
  }

  if (asset.productionQuickLook || asset.role === "iosUsdz") {
    const budget = PRODUCTION_3D_BUDGETS.variants.iosUsdz.bytes.fail;
    if (!contentLength) {
      addFail(result, `${label}: missing Content-Length/Content-Range for production Quick Look`, metric);
    } else if (contentLength > budget) {
      addFail(
        result,
        `${label}: network size ${formatBytes(contentLength)} exceeds iOS Quick Look fail budget ${formatBytes(budget)}`,
        metric
      );
    }
  }
}

async function validateRoute(route, baseUrl, fetchImpl, result) {
  const url = absoluteUrl(baseUrl, route);
  try {
    const { response, method } = await fetchHeaders(url, fetchImpl);
    const metric = { route, url, method, status: response.status };
    result.metrics.routes.push(metric);
    result.evidence.push(metric);
    if (response.status >= 400) addFail(result, `${route}: status ${response.status}`, metric);
  } catch (error) {
    addFail(result, `${route}: network error: ${error.message}`, { route, url });
  }
}

export async function validateNetworkHeaders({
  baseUrl,
  routes = [],
  assets = [],
  fetchImpl = globalThis.fetch,
  strict = false
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
    await validateAsset(asset, baseUrl, fetchImpl, result, strict);
  }

  return result;
}
