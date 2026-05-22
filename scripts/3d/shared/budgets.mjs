const MB = 1000 * 1000;
const KB = 1000;
const MiB = 1024 * 1024;

export const PRODUCTION_3D_BUDGETS = Object.freeze({
  schemaVersion: 2,
  units: {
    default: "decimal",
    iosUsdzFail: "binary"
  },
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
        target: 4 * MB,
        warning: 6 * MB,
        fail: 8 * MB
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
        target: 5 * MB,
        warning: 8 * MB,
        fail: 12 * MB
      }
    },
    signature: {
      label: "Signature dish",
      totalPublicBytes: {
        target: 10 * MB,
        warning: 14 * MB,
        fail: 18 * MB
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
      target: Math.floor(1.5 * MB),
      warning: 3 * MB,
      fail: 4 * MB
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
    note: "Triangle count is measured by asset build tooling and remains a visual QA input.",
    webTarget: 180_000,
    mobileTarget: 90_000,
    arLiteTarget: 120_000,
    fail: 320_000
  }
});

export function classifyBudget(value, budget) {
  if (!Number.isFinite(value)) return "unknown";
  if (value <= budget.target) return "target";
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
