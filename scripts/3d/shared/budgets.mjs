const MiB = 1024 * 1024;
const KiB = 1024;

export const PRODUCTION_3D_BUDGETS = Object.freeze({
  schemaVersion: 1,
  variants: {
    webGlb: {
      label: "Web GLB",
      bytes: {
        target: 10 * MiB,
        warning: 15 * MiB,
        fail: 18 * MiB
      },
      triangles: {
        target: 180_000,
        warning: 250_000,
        fail: 320_000,
        measurable: "placeholder"
      }
    },
    mobileGlb: {
      label: "Mobile GLB",
      bytes: {
        target: 6 * MiB,
        warning: 10 * MiB,
        fail: 12 * MiB
      },
      triangles: {
        target: 90_000,
        warning: 150_000,
        fail: 200_000,
        measurable: "placeholder"
      }
    },
    arLiteGlb: {
      label: "AR-lite GLB",
      bytes: {
        target: 8 * MiB,
        warning: 10 * MiB,
        fail: 12 * MiB
      },
      triangles: {
        target: 120_000,
        warning: 180_000,
        fail: 220_000,
        measurable: "placeholder"
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
        target: Math.floor(4.5 * MiB),
        warning: 5 * MiB,
        fail: 5 * MiB
      }
    },
    poster: {
      label: "Poster image",
      bytes: {
        target: 250 * KiB,
        warning: 400 * KiB,
        fail: 700 * KiB
      },
      dimensions: {
        targetMax: 1600,
        warningMax: 2200,
        failMax: 3200
      }
    }
  },
  textures: {
    maxDimension: {
      target: 1024,
      warning: 2048,
      fail: 4096
    },
    totalMobileBytes: {
      target: Math.floor(1.5 * MiB),
      warning: 3 * MiB,
      fail: 4 * MiB
    }
  },
  materials: {
    target: 4,
    warning: 6,
    fail: 8
  },
  meshes: {
    target: 3,
    warning: 6,
    fail: 10
  },
  primitives: {
    target: 3,
    warning: 6,
    fail: 10
  },
  triangleCount: {
    note: "Triangle count is a measured placeholder until every source pipeline exports authoritative geometry stats.",
    webTarget: 180_000,
    mobileTarget: 90_000,
    arLiteTarget: 120_000,
    fail: 320_000
  }
});

export function classifyBudget(value, budget) {
  if (!Number.isFinite(value)) return "unknown";
  if (value <= budget.target) return "target";
  if (value <= budget.warning) return "warning";
  return "fail";
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "unknown";
  if (bytes >= MiB) return `${(bytes / MiB).toFixed(2)} MiB`;
  if (bytes >= KiB) return `${(bytes / KiB).toFixed(1)} KiB`;
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
