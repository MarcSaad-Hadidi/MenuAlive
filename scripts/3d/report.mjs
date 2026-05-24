#!/usr/bin/env node
import { parseArgs, writeStdout } from "./shared/file-utils.mjs";
import { renderValidationResultMarkdown } from "./shared/report-utils.mjs";
import { writeReportFile } from "./shared/validators/report-writer.mjs";
import { validateDishManifestPipeline } from "./validate-dish.mjs";
import { defaultDishManifestPath, readJsonFile } from "./shared/file-utils.mjs";

const args = parseArgs(process.argv.slice(2));
const manifestPath = args.manifest ?? defaultDishManifestPath();
const result = validateDishManifestPipeline({
  manifest: readJsonFile(manifestPath),
  manifestPath,
  context: args.context ?? "production",
  requireFiles: Boolean(args["require-files"]),
  strict: Boolean(args.strict)
});
const markdown = renderValidationResultMarkdown(result);

if (args.out) {
  const writeResult = writeReportFile({ filePath: args.out, contents: markdown });
  process.exitCode = writeResult.ok && result.ok ? 0 : 1;
} else {
  writeStdout(markdown);
  process.exitCode = result.ok ? 0 : 1;
}
