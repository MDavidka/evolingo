#!/usr/bin/env node

/**
 * Avalingo / Evolingo Cowork Agentic Compatibility Framework
 * Standalone Executable E2E Test Runner
 */

import { CoworkClient } from "./harness/client.mjs";
import { SandboxVerifier } from "./harness/sandbox-verifier.mjs";
import { registerTier1Tests } from "./suites/tier1-features.test.mjs";
import { registerTier2Tests } from "./suites/tier2-boundaries.test.mjs";
import { registerTier3Tests } from "./suites/tier3-combinations.test.mjs";
import { registerTier4Tests } from "./suites/tier4-scenarios.test.mjs";

class TestRunner {
  constructor(options = {}) {
    this.target = options.target || process.env.COWORK_API_URL || "http://127.0.0.1:28500";
    // Defect 1: Propagate target to process.env so SseConsumer defaults to it
    process.env.COWORK_API_URL = this.target;

    this.verbose = Boolean(options.verbose);
    this.dryRun = Boolean(options.dryRun);
    this.listOnly = Boolean(options.listOnly);

    // Defect 2: Handle malformed regex pattern gracefully
    if (options.filter) {
      try {
        this.filterPattern = new RegExp(options.filter, "i");
      } catch (err) {
        console.error(`\x1b[31mError:\x1b[0m Invalid regular expression for --filter: "${options.filter}" (${err.message})`);
        process.exit(1);
      }
    } else {
      this.filterPattern = null;
    }

    this.selectedTier = options.tier || "all";

    this.tests = [];
    this.client = new CoworkClient({ baseUrl: this.target });
    this.sandbox = new SandboxVerifier();
  }

  /**
   * Register a test case definition.
   */
  test({ tier, id, name, fn }) {
    if (!tier || !id || !name || typeof fn !== "function") {
      throw new Error(`Invalid test registration: ${JSON.stringify({ tier, id, name })}`);
    }
    this.tests.push({ tier, id, name, fn });
  }

  printHelp() {
    console.log(`
Avalingo Cowork E2E Test Runner

Usage:
  node tests/cowork-e2e/runner.mjs [options]
  npm run test:cowork-e2e -- [options]

Options:
  --tier=1|2|3|4|all   Execute only tests belonging to the specified tier (default: all)
  --filter=<pattern>   Execute tests matching regex pattern (against id or name)
  --target=<url>       Target Cowork API URL (default: http://127.0.0.1:28500)
  --dry-run            Validate test harness, parameters, and assertions without network calls
  --list               List all registered tests without executing
  --verbose            Print verbose event logs and full stack traces
  --help               Display this help message
`);
  }

  async run() {
    // Register all suites
    registerTier1Tests(this);
    registerTier2Tests(this);
    registerTier3Tests(this);
    registerTier4Tests(this);

    // Defect 4: Filter tests before checking this.listOnly
    // Filter tests
    const filteredTests = this.tests.filter((t) => {
      if (this.selectedTier !== "all" && String(t.tier) !== String(this.selectedTier)) {
        return false;
      }
      if (this.filterPattern && !this.filterPattern.test(t.id) && !this.filterPattern.test(t.name)) {
        return false;
      }
      return true;
    });

    if (this.listOnly) {
      const isFiltered = filteredTests.length !== this.tests.length;
      console.log(
        `Registered ${filteredTests.length} tests${isFiltered ? ` (filtered from ${this.tests.length})` : ""}:`
      );
      for (const t of filteredTests) {
        console.log(`  [Tier ${t.tier}] [${t.id}] ${t.name}`);
      }
      return 0;
    }

    console.log(`Starting Cowork E2E Test Run...`);
    console.log(`Target:  ${this.target}`);
    console.log(`Tier:    ${this.selectedTier}`);
    console.log(`Filter:  ${this.filterPattern ? this.filterPattern.source : "(none)"}`);
    console.log(`Dry-run: ${this.dryRun}`);
    console.log(`Tests:   ${filteredTests.length} / ${this.tests.length} total registered\n`);

    const tierStats = {
      1: { total: 0, passed: 0, failed: 0 },
      2: { total: 0, passed: 0, failed: 0 },
      3: { total: 0, passed: 0, failed: 0 },
      4: { total: 0, passed: 0, failed: 0 },
    };

    const overallStart = Date.now();
    const failures = [];

    for (let i = 0; i < filteredTests.length; i++) {
      const t = filteredTests[i];
      const stats = tierStats[t.tier] || { total: 0, passed: 0, failed: 0 };
      stats.total++;

      const testStart = Date.now();
      try {
        await t.fn({
          client: this.client,
          sandbox: this.sandbox,
          dryRun: this.dryRun,
          target: this.target,
          log: (...args) => {
            if (this.verbose) console.log(`    [LOG]`, ...args);
          },
        });
        const duration = Date.now() - testStart;
        stats.passed++;
        console.log(`  \x1b[32m[PASS]\x1b[0m [T${t.tier}] [${t.id}] ${t.name} (${duration}ms)`);
      } catch (err) {
        const duration = Date.now() - testStart;
        stats.failed++;
        failures.push({ test: t, error: err, duration });
        console.log(`  \x1b[31m[FAIL]\x1b[0m [T${t.tier}] [${t.id}] ${t.name} (${duration}ms)`);
        if (this.verbose) {
          console.error(`    Error: ${err.message}`);
          if (err.stack) console.error(`    ${err.stack.split("\n").slice(1, 4).join("\n    ")}`);
        }
      }
    }

    const overallDurationSec = ((Date.now() - overallStart) / 1000).toFixed(1);
    const totalExecuted = filteredTests.length;
    const totalPassed = Object.values(tierStats).reduce((acc, s) => acc + s.passed, 0);
    const totalFailed = Object.values(tierStats).reduce((acc, s) => acc + s.failed, 0);

    const calcPct = (p, tot) => (tot === 0 ? "N/A" : `${Math.round((p / tot) * 100)}%`);

    console.log("\n==============================================================");
    console.log("Avalingo Cowork E2E Test Suite Summary");
    console.log("==============================================================");
    console.log(`Tier 1 (Feature Coverage):        ${tierStats[1].passed} / ${tierStats[1].total} passed (${calcPct(tierStats[1].passed, tierStats[1].total)})`);
    console.log(`Tier 2 (Boundary & Corner Cases): ${tierStats[2].passed} / ${tierStats[2].total} passed (${calcPct(tierStats[2].passed, tierStats[2].total)})`);
    console.log(`Tier 3 (Cross-Feature Combos):    ${tierStats[3].passed} / ${tierStats[3].total} passed (${calcPct(tierStats[3].passed, tierStats[3].total)})`);
    console.log(`Tier 4 (Real-World Scenarios):    ${tierStats[4].passed} / ${tierStats[4].total} passed (${calcPct(tierStats[4].passed, tierStats[4].total)})`);
    console.log("--------------------------------------------------------------");
    console.log(`TOTAL TESTS:                     ${totalPassed} / ${totalExecuted} passed`);
    console.log(`TOTAL DURATION:                  ${overallDurationSec}s`);
    console.log(`RESULT:                          ${totalFailed === 0 && totalExecuted > 0 ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}`);
    console.log("==============================================================\n");

    if (failures.length > 0) {
      console.log(`Failed Tests Summary (${failures.length}):`);
      for (const f of failures) {
        console.log(`  - [Tier ${f.test.tier}] [${f.test.id}] ${f.test.name}`);
        console.log(`    ${f.error.message}\n`);
      }
    }

    return totalFailed === 0 && totalExecuted > 0 ? 0 : 1;
  }
}

// Parse command line arguments
function parseArgs(argv) {
  const options = {
    tier: "all",
    filter: null,
    target: null,
    verbose: false,
    dryRun: false,
    listOnly: false,
    help: false,
  };

  for (const arg of argv.slice(2)) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--verbose" || arg === "-v") {
      options.verbose = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--list" || arg === "-l") {
      options.listOnly = true;
    } else if (arg.startsWith("--tier=")) {
      // Defect 3: slice after first '=' to preserve all characters
      options.tier = arg.slice(arg.indexOf("=") + 1);
    } else if (arg.startsWith("--filter=")) {
      options.filter = arg.slice(arg.indexOf("=") + 1);
    } else if (arg.startsWith("--target=")) {
      options.target = arg.slice(arg.indexOf("=") + 1);
    }
  }

  return options;
}

// CLI entry point
const options = parseArgs(process.argv);
const runner = new TestRunner(options);

if (options.help) {
  runner.printHelp();
  process.exit(0);
}

runner.run()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((err) => {
    console.error("Fatal runner error:", err);
    process.exit(1);
  });
