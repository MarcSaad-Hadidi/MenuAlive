#!/usr/bin/env node
import { parseRunnerArgs, runOnce, sanitizeRunnerLogLine } from "./runner.mjs";

try {
  const args = parseRunnerArgs(["--once", ...process.argv.slice(2)]);
  const result = await runOnce(args);
  process.stdout.write(`${result.ok ? "ok" : "failed"}: ${result.claimed ? "processed 1 job" : "no queued job"}\n`);
  process.exitCode = result.ok ? 0 : 1;
} catch (error) {
  process.stderr.write(`${sanitizeRunnerLogLine(error instanceof Error ? error.message : String(error))}\n`);
  process.exitCode = 1;
}
