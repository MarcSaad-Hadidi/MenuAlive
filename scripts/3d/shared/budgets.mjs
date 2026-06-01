const MB = 1000 * 1000;
const KB = 1000;
export const MiB = 1024 * 1024;

export const PRODUCTION_3D_BUDGETS = Object.freeze({
  schemaVersion: 1,
  policyReferences: [
    "docs/repo-asset-policy.md",
    "scripts/check-large-files.mjs",
    "scripts/check-lfs-policy.mjs"
  ],
  variants: {
    webGlb: {
      label: "Web GLB",
      bytes: {
        target: 6 * MB,
        warning: 8 * MB,
        fail: 12 * MB
      }
    },
    mobileGlb: {
      label: "Mobile GLB",
      bytes: {
        target: 3 * MB,
        warning: 5 * MB,
        fail: 8 * MB
      }
    },
    arLiteGlb: {
      label: "AR-lite GLB",
      bytes: {
        target: 8 * MiB,
        warning: 12 * MiB,
        fail: 15 * MiB
      },
      triangles: {
        target: 70_000,
        warning: 100_000,
        fail: 150_000
      },
      requiredExtensions: {
        target: 0,
        warning: 0,
        fail: 1
      }
    },
    iosUsdz: {
      label: "iOS Quick Look USDZ",
      bytes: {
        target: Math.floor(3.5 * MB),
        warning: Math.floor(4.5 * MB),
        fail: 5 * MiB
      }
    },
    poster: {
      label: "Poster image",
      bytes: {
        target: 150 * KB,
        warning: 250 * KB,
        fail: 500 * KB
      },
      dimensions: {
        targetMax: 1600,
        warningMax: 2200,
        failMax: 3200
      }
    }
  },
  profiles: {
    simpleDish: {
      label: "Simple dish",
      totalPublicBytes: {
        target: 8 * MB,
        warning: 14 * MB,
        fail: 22 * MiB
      }
    },
    signature: {
      label: "Signature dish",
      totalPublicBytes: {
        target: 14 * MB,
        warning: 24 * MB,
        fail: 32 * MiB
      }
    }
  }
});

export function classifyBudget(value, budget) {
  if (!Number.isFinite(value)) return "unknown";
  if (value <= budget.target) return "target";
  if (value <= budget.warning) return "advisory";
  if (value <= budget.fail) return "warning";
  return "fail";
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "unknown";
  if (bytes >= MiB) return `${(bytes / MiB).toFixed(2)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

export function variantBudgetKey(variantKey) {
  return {
    web: "webGlb",
    mobile: "mobileGlb",
    arLite: "arLiteGlb",
    iosUsdz: "iosUsdz",
    poster: "poster"
  }[variantKey];
}
