import "server-only";

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getAllDishes, getRestaurant } from "@/lib/demoMenuData";
import {
  resolvePipelineStatus,
  type PipelineStatusTone
} from "@/lib/owner/threeDArPipelineModel";
import {
  buildDeviceQaState,
  type DeviceQaState
} from "@/lib/owner/threeDDeviceQaModel";
import { cleanOwner3dPathSegment } from "@/lib/owner/owner3dPathSegments";
import {
  buildVisualReviewState,
  type VisualReviewState
} from "@/lib/owner/threeDVisualReviewModel";

type JsonObject = Record<string, unknown>;

type PipelineIdentity = {
  restaurantSlug: string;
  menuSlug: string;
  dishSlug: string;
  version: string;
};

type ReportBundle = {
  directory: string;
  sourceAnalysis: JsonObject | null;
  candidateReport: JsonObject | null;
  visualQuality: JsonObject | null;
  visualReport: JsonObject | null;
  optimizationReport: JsonObject | null;
  uploadPlan: JsonObject | null;
};

export type Owner3dVisualReview = VisualReviewState & {
  restaurantName: string;
  menuName: string;
  dishName: string;
  statusLabel: string;
  statusTone: PipelineStatusTone;
  manifestPath: string | null;
  reportDirectory: string | null;
  versionHref: string;
  deviceQa: DeviceQaState;
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectValue(value: unknown): JsonObject | null {
  return isObject(value) ? value : null;
}

function stringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function identityFromParams(params: PipelineIdentity): PipelineIdentity | null {
  const identity = {
    restaurantSlug: cleanOwner3dPathSegment(params.restaurantSlug),
    menuSlug: cleanOwner3dPathSegment(params.menuSlug),
    dishSlug: cleanOwner3dPathSegment(params.dishSlug),
    version: cleanOwner3dPathSegment(params.version)
  };

  if (
    !identity.restaurantSlug ||
    !identity.menuSlug ||
    !identity.dishSlug ||
    !identity.version
  ) {
    return null;
  }
  if (
    identity.restaurantSlug !== params.restaurantSlug ||
    identity.menuSlug !== params.menuSlug ||
    identity.dishSlug !== params.dishSlug ||
    identity.version !== params.version
  ) {
    return null;
  }
  return identity;
}

function readJsonObject(filePath: string): JsonObject | null {
  try {
    if (!existsSync(filePath) || !statSync(filePath).isFile()) return null;
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toRepoPath(filePath: string): string {
  return relative(/* turbopackIgnore: true */ process.cwd(), filePath).replaceAll("\\", "/");
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function maybeNameFromManifest(manifest: JsonObject | null, key: string, slug: string): string {
  return stringValue(manifest?.[key], titleFromSlug(slug));
}

function manifestFilePath(identity: PipelineIdentity): string {
  return join(
    /* turbopackIgnore: true */ process.cwd(),
    "public",
    "models",
    "restaurants",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version,
    "manifest.json"
  );
}

function reportBundle(identity: PipelineIdentity): ReportBundle {
  const directory = join(
    /* turbopackIgnore: true */ process.cwd(),
    "assets",
    "3d",
    "reports",
    identity.restaurantSlug,
    identity.menuSlug,
    identity.dishSlug,
    identity.version
  );

  return {
    directory,
    sourceAnalysis: readJsonObject(join(directory, "source-analysis.json")),
    candidateReport: readJsonObject(join(directory, "candidate-report.json")),
    visualQuality: readJsonObject(join(directory, "visual-quality.json")),
    visualReport: readJsonObject(join(directory, "visual-report.json")),
    optimizationReport: readJsonObject(join(directory, "optimization-report.json")),
    uploadPlan: readJsonObject(join(directory, "upload-plan.json"))
  };
}

function hasAnyReport(reports: ReportBundle): boolean {
  return Boolean(
    reports.sourceAnalysis ||
      reports.candidateReport ||
      reports.visualQuality ||
      reports.visualReport ||
      reports.optimizationReport ||
      reports.uploadPlan
  );
}

export function getOwner3dVisualReview(params: PipelineIdentity): Owner3dVisualReview | null {
  const identity = identityFromParams(params);
  if (!identity) return null;

  const manifestPath = manifestFilePath(identity);
  const manifest = readJsonObject(manifestPath);
  const reports = reportBundle(identity);
  const restaurant = getRestaurant();
  const fallbackDish =
    !manifest &&
    identity.restaurantSlug === restaurant.slug &&
    identity.menuSlug === "demo" &&
    identity.version === "demo-runtime"
      ? getAllDishes().find((dish) => dish.slug === identity.dishSlug)
      : null;

  if (!manifest && !hasAnyReport(reports) && !fallbackDish) return null;

  const manifestVisualQuality = objectValue(manifest?.visualQuality);
  const visualReport = reports.visualReport ?? manifestVisualQuality;
  const candidateReport =
    reports.candidateReport ?? objectValue(manifest?.candidateReport);
  const status = resolvePipelineStatus({
    manifest,
    candidateReport,
    hasSourceAnalysis: Boolean(reports.sourceAnalysis),
    hasRunningReport: Boolean(reports.optimizationReport && !reports.candidateReport)
  });
  const state = buildVisualReviewState({
    identity,
    visualReport,
    candidateReport,
    manifest
  });
  const deviceQa = buildDeviceQaState({
    identity,
    manifest
  });

  return {
    ...state,
    restaurantName: manifest
      ? maybeNameFromManifest(manifest, "restaurantName", identity.restaurantSlug)
      : fallbackDish
        ? restaurant.name
        : titleFromSlug(identity.restaurantSlug),
    menuName: fallbackDish ? "Menu demo" : titleFromSlug(identity.menuSlug),
    dishName: manifest
      ? maybeNameFromManifest(manifest, "dishName", identity.dishSlug)
      : fallbackDish
        ? fallbackDish.name
        : titleFromSlug(identity.dishSlug),
    statusLabel: status.label,
    statusTone: status.tone,
    manifestPath: manifest ? toRepoPath(manifestPath) : null,
    reportDirectory: existsSync(reports.directory) ? toRepoPath(reports.directory) : null,
    versionHref: `/owner/3d-ar/${identity.restaurantSlug}/${identity.menuSlug}/${identity.dishSlug}/${identity.version}`,
    deviceQa
  };
}
