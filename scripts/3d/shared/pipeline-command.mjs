import { existsSync } from "node:fs";
import { join, normalize, sep } from "node:path";

import { parseArgs, readJsonFile, writeStdout } from "./file-utils.mjs";
import { validateDishManifestPipeline } from "../validate-dish.mjs";

const HELP = `Vistaire 3D production command

Common identity flags:
  --restaurant <slug>  Restaurant slug
  --menu <slug>        Menu slug
  --dish <slug>        Dish slug
  --version <version>  Asset version
  --manifest <path>    Dish manifest path
  --dry-run            Show planned actions without writing
  --help               Show this help
`;

function cleanSegment(value, label) {
  const segment = String(value ?? "").trim();
  if (!segment) return "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(segment)) {
    throw new Error(`${label} must be a slug-like path segment`);
  }
  return segment;
}

function safeJoin(rootDir, ...segments) {
  const normalizedRoot = normalize(rootDir);
  const fullPath = normalize(join(rootDir, ...segments));
  if (fullPath !== normalizedRoot && !fullPath.startsWith(`${normalizedRoot}${sep}`)) {
    throw new Error(`Refusing path outside ${rootDir}`);
  }
  return fullPath;
}

function identityFromArgs(args) {
  return {
    restaurantSlug: cleanSegment(args.restaurant ?? args["restaurant-slug"], "restaurant"),
    menuSlug: cleanSegment(args.menu ?? args["menu-slug"], "menu"),
    dishSlug: cleanSegment(args.dish ?? args["dish-slug"], "dish"),
    version: String(args.version ?? "").trim()
  };
}

function productionPaths(identity) {
  const { restaurantSlug, menuSlug, dishSlug, version } = identity;
  const source = restaurantSlug && menuSlug && dishSlug && version
    ? safeJoin("assets/3d/source", restaurantSlug, menuSlug, dishSlug, version)
    : "";
  const work = restaurantSlug && menuSlug && dishSlug && version
    ? safeJoin("assets/3d/work", restaurantSlug, menuSlug, dishSlug, version)
    : "";
  const reports = restaurantSlug && menuSlug && dishSlug && version
    ? safeJoin("assets/3d/reports", restaurantSlug, menuSlug, dishSlug, version)
    : "";
  const publicBase = restaurantSlug && menuSlug && dishSlug && version
    ? `/models/restaurants/${restaurantSlug}/${menuSlug}/${dishSlug}/${version}`
    : "";

  return { source, work, reports, publicBase };
}

function validateManifestForCommand(args, { strict = false } = {}) {
  if (!args.manifest) return null;
  return validateDishManifestPipeline({
    manifest: readJsonFile(args.manifest),
    manifestPath: args.manifest,
    context: args.context ?? "production",
    requireFiles: Boolean(args["require-files"]),
    rootDir: args.root ?? process.cwd(),
    strict
  });
}

function resultFor(commandName, args, extra = {}) {
  const identity = identityFromArgs(args);
  const paths = productionPaths(identity);
  return {
    ok: true,
    name: commandName,
    dryRun: Boolean(args["dry-run"]) || !args.write,
    identity,
    paths,
    warnings: [],
    fails: [],
    evidence: [
      {
        commandName,
        manifestPath: args.manifest ?? "",
        sourceExists: paths.source ? existsSync(paths.source) : false,
        workExists: paths.work ? existsSync(paths.work) : false
      }
    ],
    manualChecksRequired: [
      "Manual visual approval",
      "Chrome DevTools network verification",
      "Real iPhone Safari Quick Look validation",
      "Real Android Scene Viewer validation"
    ],
    ...extra
  };
}

function runAnalyzeSource(commandName, args) {
  const output = resultFor(commandName, args);
  if (!output.paths.source) {
    output.warnings.push("No complete --restaurant/--menu/--dish/--version identity was provided.");
  } else if (!existsSync(output.paths.source)) {
    output.warnings.push("Source directory is absent; place source assets outside Git before optimization.");
  }
  return output;
}

function runOptimizationPlan(commandName, args) {
  const output = resultFor(commandName, args, {
    plannedStages: [
      "inspect source",
      "normalize scale/origin/orientation",
      "optimize web GLB",
      "optimize mobile GLB",
      "build Android AR-lite GLB",
      "build iOS USDZ",
      "generate poster",
      "write manifest",
      "write validation report"
    ]
  });
  output.warnings.push("Optimization is intentionally non-mutating until source assets and approval flags are provided.");
  return output;
}

function runPreview(commandName, args) {
  const output = resultFor(commandName, args);
  output.preview = {
    route: output.identity.dishSlug ? `/demo/dishes/${output.identity.dishSlug}` : "/demo",
    manifestPath: args.manifest ?? ""
  };
  return output;
}

function runPublish(commandName, args) {
  const validation = validateManifestForCommand(args, { strict: true });
  const output = resultFor(commandName, args, { validation });
  if (!args["quality-approved"]) {
    output.fails.push("Publish requires --quality-approved.");
  }
  if (!args["approved-by"]) {
    output.fails.push("Publish requires --approved-by.");
  }
  if (validation && !validation.ok) {
    output.fails.push("Manifest validation failed; publish rejected.");
  }
  output.rollbackCommand = output.identity.dishSlug
    ? `npm run 3d:rollback -- --restaurant ${output.identity.restaurantSlug} --menu ${output.identity.menuSlug} --dish ${output.identity.dishSlug} --to previous --dry-run`
    : "npm run 3d:rollback -- --manifest <path> --to previous --dry-run";
  output.ok = output.fails.length === 0;
  return output;
}

function runRollback(commandName, args) {
  const output = resultFor(commandName, args);
  if (!args.to) output.fails.push("Rollback requires --to <version|previous>.");
  output.ok = output.fails.length === 0;
  return output;
}

function runCleanStale(commandName, args) {
  const output = resultFor(commandName, args);
  if (!args["dry-run"] && !args.write) {
    output.fails.push("Clean-stale is non-destructive by default; pass --dry-run to inspect or --write after review.");
  }
  output.ok = output.fails.length === 0;
  return output;
}

export function runPipelineCommand(commandName, argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    writeStdout(HELP);
    return { ok: true, name: commandName };
  }

  let output;
  try {
    if (commandName === "3d:analyze-source") output = runAnalyzeSource(commandName, args);
    else if (commandName === "3d:preview") output = runPreview(commandName, args);
    else if (commandName === "3d:publish") output = runPublish(commandName, args);
    else if (commandName === "3d:rollback") output = runRollback(commandName, args);
    else if (commandName === "3d:clean-stale") output = runCleanStale(commandName, args);
    else output = runOptimizationPlan(commandName, args);
  } catch (error) {
    output = {
      ok: false,
      name: commandName,
      warnings: [],
      fails: [error.message],
      evidence: []
    };
  }

  process.exitCode = output.ok ? 0 : 1;
  writeStdout(output, true);
  return output;
}
