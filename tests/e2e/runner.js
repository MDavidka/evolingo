#!/usr/bin/env node
/**
 * Master E2E Test Runner for Evolingo
 * 
 * Orchestrates and executes Tier 1, Tier 2, Tier 3, and Tier 4 test suites.
 * Aggregates results, duration, and tier breakdown.
 * Generates structured JSON summary at /root/evolingo/tests/e2e/e2e_results.json.
 * Exits with code 0 on 100% pass, or non-zero on failure.
 */

const fs = require('fs');
const path = require('path');
const { colors } = require('./utils/harness');

const E2E_DIR = path.resolve(__dirname);
const RESULTS_JSON_PATH = path.join(E2E_DIR, 'e2e_results.json');

const MIN_REQUIRED_TESTS = 242;
const TIER_THRESHOLDS = {
  tier1: 105,
  tier2: 105,
  tier3: 21,
  tier4: 11
};

// Tier definitions
const TIERS = [
  {
    id: 'tier1',
    number: 1,
    name: 'Tier 1: Feature Coverage',
    file: path.join(E2E_DIR, 'tier1_feature_coverage.test.js'),
    description: 'Equivalence class feature coverage (Features 1 to 21)'
  },
  {
    id: 'tier2',
    number: 2,
    name: 'Tier 2: Boundary & Corner Cases',
    file: path.join(E2E_DIR, 'tier2_boundary_corner.test.js'),
    description: 'Boundary values, edge cases, nil safety, error handling'
  },
  {
    id: 'tier3',
    number: 3,
    name: 'Tier 3: Cross-Feature Combinations',
    file: path.join(E2E_DIR, 'tier3_cross_feature.test.js'),
    description: 'Pairwise feature interaction and state transitions'
  },
  {
    id: 'tier4',
    number: 4,
    name: 'Tier 4: Real-World Application Scenarios',
    file: path.join(E2E_DIR, 'tier4_real_world.test.js'),
    description: 'End-to-end multi-feature user journey workflows'
  }
];

// CLI Arguments Parser
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    selectedTiers: [1, 2, 3, 4],
    filter: null,
    bail: false,
    silent: false,
    jsonOut: RESULTS_JSON_PATH
  };

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      const val = arg.split('=')[1];
      options.selectedTiers = val.split(',').map(n => parseInt(n.trim(), 10)).filter(Boolean);
    } else if (arg === '-t' && args[args.indexOf(arg) + 1]) {
      const val = args[args.indexOf(arg) + 1];
      options.selectedTiers = val.split(',').map(n => parseInt(n.trim(), 10)).filter(Boolean);
    } else if (arg.startsWith('--filter=')) {
      options.filter = arg.split('=')[1];
    } else if (arg === '--bail') {
      options.bail = true;
    } else if (arg === '--silent') {
      options.silent = true;
    } else if (arg.startsWith('--json-out=')) {
      options.jsonOut = path.resolve(arg.split('=')[1]);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return options;
}

function printHelp() {
  console.log(`
${colors.bold}Evolingo Master E2E Test Runner${colors.reset}

Usage:
  node runner.js [options]

Options:
  --tier=<1,2,3,4>    Select specific tier(s) to run (comma-separated, e.g. --tier=3,4)
  --filter=<string>   Filter tests matching substring or regex
  --bail              Stop running immediately after first failure
  --silent            Suppress individual test output; print only summary
  --json-out=<path>   Custom output path for results JSON
  --help, -h          Show this help message
`);
}

async function runTier(tierConfig, options) {
  if (!fs.existsSync(tierConfig.file)) {
    return {
      tierId: tierConfig.id,
      tierNumber: tierConfig.number,
      tierName: tierConfig.name,
      description: tierConfig.description,
      status: 'MISSING',
      error: `Test file not found: ${tierConfig.file}`,
      summary: { total: 1, passed: 0, failed: 1, skipped: 0, durationMs: 0, passRate: '0%' },
      results: [{
        tierId: tierConfig.id,
        tierNumber: tierConfig.number,
        id: `${tierConfig.number}.0`,
        name: `Suite File Existence: ${tierConfig.file}`,
        status: 'FAIL',
        durationMs: 0,
        error: { message: `Test suite file missing: ${tierConfig.file}` }
      }]
    };
  }

  const startTime = Date.now();
  try {
    // Dynamically require tier test suite
    delete require.cache[require.resolve(tierConfig.file)];
    const tierModule = require(tierConfig.file);
    let runResult = null;

    if (tierModule.runSuite && typeof tierModule.runSuite === 'function') {
      runResult = await tierModule.runSuite({
        filter: options.filter,
        bail: options.bail,
        silent: options.silent
      });
    } else if (tierModule.suite && typeof tierModule.suite.run === 'function') {
      runResult = await tierModule.suite.run({
        filter: options.filter,
        bail: options.bail,
        silent: options.silent
      });
    } else if (typeof tierModule.run === 'function') {
      runResult = await tierModule.run({
        filter: options.filter,
        bail: options.bail,
        silent: options.silent
      });
    } else {
      throw new Error(`Module ${tierConfig.file} does not export an executable test suite or runSuite function.`);
    }

    const duration = Date.now() - startTime;
    return {
      tierId: tierConfig.id,
      tierNumber: tierConfig.number,
      tierName: tierConfig.name,
      description: tierConfig.description,
      status: runResult.summary.failed === 0 ? 'PASS' : 'FAIL',
      summary: {
        ...runResult.summary,
        durationMs: duration
      },
      results: runResult.results || []
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    return {
      tierId: tierConfig.id,
      tierNumber: tierConfig.number,
      tierName: tierConfig.name,
      description: tierConfig.description,
      status: 'ERROR',
      error: err.message,
      stack: err.stack,
      summary: { total: 0, passed: 0, failed: 1, skipped: 0, durationMs: duration, passRate: '0%' },
      results: []
    };
  }
}

function printSummaryBanner(tierReports, overallSummary) {
  console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}                     EVOLINGO E2E MASTER TEST EXECUTION REPORT                            ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.bold}${'Tier'.padEnd(8)} ${'Suite Name'.padEnd(42)} ${'Total'.padStart(6)} ${'Passed'.padStart(7)} ${'Failed'.padStart(7)} ${'Pass Rate'.padStart(10)} ${'Duration'.padStart(9)}${colors.reset}`);
  console.log(`${'─'.repeat(8)} ${'─'.repeat(42)} ${'─'.repeat(6)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(10)} ${'─'.repeat(9)}`);

  for (const report of tierReports) {
    const tierLabel = `Tier ${report.tierNumber || '?'}`;
    const nameLabel = report.tierName.replace(/^Tier \d+:\s*/, '').slice(0, 40);
    const total = String(report.summary.total);
    const passed = String(report.summary.passed);
    const failed = String(report.summary.failed);
    const rate = report.summary.passRate;
    const dur = `${report.summary.durationMs}ms`;

    const statusColor = report.summary.failed === 0 && report.summary.total > 0 ? colors.green : colors.red;

    console.log(
      `${statusColor}${tierLabel.padEnd(8)}${colors.reset} ` +
      `${nameLabel.padEnd(42)} ` +
      `${total.padStart(6)} ` +
      `${colors.green}${passed.padStart(7)}${colors.reset} ` +
      `${(report.summary.failed > 0 ? colors.red : colors.dim)}${failed.padStart(7)}${colors.reset} ` +
      `${statusColor}${rate.padStart(10)}${colors.reset} ` +
      `${dur.padStart(9)}`
    );
  }

  console.log(`${'─'.repeat(8)} ${'─'.repeat(42)} ${'─'.repeat(6)} ${'─'.repeat(7)} ${'─'.repeat(7)} ${'─'.repeat(10)} ${'─'.repeat(9)}`);
  
  const overallColor = overallSummary.failed === 0 && overallSummary.total > 0 ? colors.green : colors.red;
  console.log(
    `${colors.bold}${'OVERALL'.padEnd(8)} ` +
    `${'Aggregated E2E Test Suite'.padEnd(42)} ` +
    `${String(overallSummary.total).padStart(6)} ` +
    `${colors.green}${String(overallSummary.passed).padStart(7)}${colors.reset}${colors.bold} ` +
    `${(overallSummary.failed > 0 ? colors.red : colors.dim)}${String(overallSummary.failed).padStart(7)}${colors.reset}${colors.bold} ` +
    `${overallColor}${overallSummary.passRate.padStart(10)}${colors.reset}${colors.bold} ` +
    `${(overallSummary.durationMs + 'ms').padStart(9)}${colors.reset}`
  );

  console.log(`\n${colors.bold}${colors.cyan}═════════════════════════════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

function printFailureDiagnostics(tierReports) {
  const allFailures = [];
  for (const report of tierReports) {
    for (const test of report.results) {
      if (test.status === 'FAIL') {
        allFailures.push({
          tier: report.tierName,
          testId: test.id,
          featureId: test.featureId,
          featureTitle: test.featureTitle,
          name: test.name,
          error: test.error
        });
      }
    }
  }

  if (allFailures.length === 0) return;

  console.log(`${colors.bold}${colors.red}FAILURE DIAGNOSTIC REPORT (${allFailures.length} failed tests):${colors.reset}\n`);
  for (const [idx, fail] of allFailures.entries()) {
    console.log(`${colors.bold}${colors.red}[${idx + 1}] ${fail.tier} — Test ${fail.testId}: ${fail.name}${colors.reset}`);
    if (fail.featureTitle) {
      console.log(`    ${colors.dim}Feature: ${fail.featureId} (${fail.featureTitle})${colors.reset}`);
    }
    if (fail.error) {
      console.log(`    ${colors.yellow}Reason: ${fail.error.message}${colors.reset}`);
      if (fail.error.expected !== undefined && fail.error.actual !== undefined) {
        console.log(`    ${colors.dim}Expected: ${JSON.stringify(fail.error.expected)}${colors.reset}`);
        console.log(`    ${colors.dim}Actual:   ${JSON.stringify(fail.error.actual)}${colors.reset}`);
      }
      if (fail.error.operator) {
        console.log(`    ${colors.dim}Operator: ${fail.error.operator}${colors.reset}`);
      }
    }
    console.log('');
  }
}

async function main() {
  const options = parseArgs();
  console.log(`Starting Evolingo Master E2E Runner at ${new Date().toISOString()}`);
  console.log(`Selected Tiers: [${options.selectedTiers.join(', ')}]`);

  const startTime = Date.now();
  const activeTiers = TIERS.filter(t => options.selectedTiers.includes(t.number));
  const tierReports = [];

  let overallTotal = 0;
  let overallPassed = 0;
  let overallFailed = 0;
  let overallSkipped = 0;
  const allResults = [];

  for (const tierConfig of activeTiers) {
    const report = await runTier(tierConfig, options);
    tierReports.push(report);

    overallTotal += report.summary.total;
    overallPassed += report.summary.passed;
    overallFailed += report.summary.failed;
    overallSkipped += report.summary.skipped;

    for (const r of report.results) {
      allResults.push({
        tierId: report.tierId,
        tierNumber: report.tierNumber,
        ...r
      });
    }

    if (options.bail && report.summary.failed > 0) {
      console.log(`\n${colors.bgRed}${colors.white} Bailing master execution after failure in ${tierConfig.name} ${colors.reset}\n`);
      break;
    }
  }

  const totalDuration = Date.now() - startTime;
  const overallSummary = {
    total: overallTotal,
    passed: overallPassed,
    failed: overallFailed,
    skipped: overallSkipped,
    durationMs: totalDuration,
    passRate: overallTotal > 0 ? ((overallPassed / overallTotal) * 100).toFixed(1) + '%' : '0%'
  };

  // Print Summary Table
  printSummaryBanner(tierReports, overallSummary);

  // Print Diagnostic Details for any failures
  printFailureDiagnostics(tierReports);

  const isFullSuite = TIERS.every(t => options.selectedTiers.includes(t.number));
  
  // Construct Structured JSON Report with all 4 tiers always represented
  const tiersBreakdown = {};
  for (const tierConfig of TIERS) {
    const report = tierReports.find(r => r.tierId === tierConfig.id);
    if (report) {
      tiersBreakdown[tierConfig.id] = {
        name: report.tierName,
        number: report.tierNumber,
        description: report.description,
        status: report.status,
        summary: report.summary,
        testCount: report.results.length,
        threshold: TIER_THRESHOLDS[tierConfig.id] || 0,
        thresholdMet: report.summary.total >= (TIER_THRESHOLDS[tierConfig.id] || 0)
      };
    } else {
      tiersBreakdown[tierConfig.id] = {
        name: tierConfig.name,
        number: tierConfig.number,
        description: tierConfig.description,
        status: options.bail && overallFailed > 0 ? 'ABORTED_DUE_TO_BAIL' : 'SKIPPED',
        summary: { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, passRate: 'N/A' },
        testCount: 0,
        threshold: TIER_THRESHOLDS[tierConfig.id] || 0,
        thresholdMet: false
      };
    }
  }

  const structuredReport = {
    timestamp: new Date().toISOString(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version,
      projectRoot: path.resolve(E2E_DIR, '../..')
    },
    suiteMetadata: {
      isFullSuite,
      selectedTiers: options.selectedTiers,
      executedTiersCount: tierReports.length,
      totalTiersCount: TIERS.length,
      minRequiredTotalTests: MIN_REQUIRED_TESTS,
      thresholdSatisfied: isFullSuite ? overallTotal >= MIN_REQUIRED_TESTS : false
    },
    overall: {
      ...overallSummary,
      isFullSuite
    },
    tiers: tiersBreakdown,
    results: allResults
  };

  try {
    fs.writeFileSync(options.jsonOut, JSON.stringify(structuredReport, null, 2), 'utf8');
    console.log(`${colors.green}✔ Emitted structured report to: ${options.jsonOut}${colors.reset}\n`);
  } catch (err) {
    console.error(`Warning: Failed to write ${options.jsonOut}:`, err.message);
  }

  // Final Exit Code
  const isZeroExecution = overallTotal === 0;
  const isBelowThreshold = isFullSuite && overallTotal < MIN_REQUIRED_TESTS;
  const hasMissingTiers = tierReports.some(r => r.status === 'MISSING');

  if (overallFailed > 0 || isZeroExecution || isBelowThreshold || hasMissingTiers) {
    if (isZeroExecution) {
      console.log(`${colors.red}✖ E2E Execution failed: Zero tests were executed.${colors.reset}\n`);
    } else if (isBelowThreshold) {
      console.log(`${colors.red}✖ E2E Execution failed: Executed test count (${overallTotal}) is below required minimum threshold (${MIN_REQUIRED_TESTS}).${colors.reset}\n`);
    } else if (hasMissingTiers) {
      console.log(`${colors.red}✖ E2E Execution failed: One or more test suite files are missing.${colors.reset}\n`);
    } else {
      console.log(`${colors.red}✖ E2E Execution completed with ${overallFailed} failure(s).${colors.reset}\n`);
    }
    process.exit(1);
  } else {
    console.log(`${colors.green}✔ All executed E2E tests (${overallPassed}/${overallTotal}) PASSED successfully!${colors.reset}\n`);
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Master runner fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  runTier,
  parseArgs,
  TIERS
};
