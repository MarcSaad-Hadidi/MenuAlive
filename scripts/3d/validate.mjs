#!/usr/bin/env node
import { runValidateDishCli } from "./validate-dish.mjs";

runValidateDishCli(process.argv.slice(2));
