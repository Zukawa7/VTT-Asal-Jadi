#!/usr/bin/env node
/**
 * Master E2E Test Runner for VTT Asal Jadi
 * Standalone Node.js ESM test runner executing Tiers 1 through 4 across all 12 system features.
 */

import { tier1Suite } from './tier1_features.test.js';
import { tier2Suite } from './tier2_boundaries.test.js';
import { tier3Suite } from './tier3_combinations.test.js';
import { tier4Suite } from './tier4_realworld.test.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

// Parse CLI Arguments
const args = process.argv.slice(2);
const options = {
  tier: null,
  feature: null,
  filter: null,
  bail: false,
  json: false,
  verbose: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--tier' && args[i + 1]) {
    options.tier = parseInt(args[++i], 10);
  } else if (arg === '--feature' && args[i + 1]) {
    options.feature = args[++i].toUpperCase();
  } else if (arg === '--filter' && args[i + 1]) {
    options.filter = args[++i];
  } else if (arg === '--bail') {
    options.bail = true;
  } else if (arg === '--json') {
    options.json = true;
  } else if (arg === '--verbose') {
    options.verbose = true;
  } else if (arg === '-h' || arg === '--help') {
    console.log(`
VTT Asal Jadi - E2E Master Test Runner
Usage: node tests/e2e/runner.js [options]

Options:
  --tier <1|2|3|4>    Execute only specific tier suite
  --feature <F1..F12> Filter tests matching specific feature
  --filter <regex>    Filter tests matching ID or description
  --bail              Stop execution immediately on first failure
  --json              Output machine-readable JSON results
  --verbose           Display detailed step traces
  --help, -h          Show this help message
`);
    process.exit(0);
  }
}

async function main() {
  const overallStart = Date.now();
  const suitesToRun = [];

  if (!options.tier || options.tier === 1) suitesToRun.push({ tierNum: 1, suite: tier1Suite });
  if (!options.tier || options.tier === 2) suitesToRun.push({ tierNum: 2, suite: tier2Suite });
  if (!options.tier || options.tier === 3) suitesToRun.push({ tierNum: 3, suite: tier3Suite });
  if (!options.tier || options.tier === 4) suitesToRun.push({ tierNum: 4, suite: tier4Suite });

  if (!options.json) {
    console.log(`${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}   🎲 VTT ASAL JADI — END-TO-END (E2E) OPAQUE-BOX TEST RUNNER 🎲   ${colors.reset}`);
    console.log(`${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
    console.log(`${colors.dim}Target: Full Dark Fantasy UI & Backend Architecture Verification (138 Tests)${colors.reset}\n`);
  }

  const allResults = [];
  const tierSummaries = [];

  for (const { tierNum, suite } of suitesToRun) {
    if (!options.json) {
      console.log(`${colors.bold}${colors.yellow}▶ ${suite.name}${colors.reset}`);
    }

    const suiteResults = await suite.run(options);
    allResults.push(...suiteResults);

    let passed = 0;
    let failed = 0;
    let totalDuration = 0;

    for (const res of suiteResults) {
      totalDuration += res.duration;
      if (res.status === 'pass') {
        passed++;
        if (!options.json) {
          console.log(`  ${colors.green}✔${colors.reset} [${colors.bold}${res.id}${colors.reset}] ${res.name} ${colors.dim}(${res.duration}ms)${colors.reset}`);
        }
      } else {
        failed++;
        if (!options.json) {
          console.log(`  ${colors.red}✖${colors.reset} [${colors.bold}${res.id}${colors.reset}] ${res.name} ${colors.dim}(${res.duration}ms)${colors.reset}`);
          if (res.error) {
            console.log(`    ${colors.red}${res.error.message || res.error}${colors.reset}`);
            if (options.verbose && res.error.stack) {
              console.log(`${colors.dim}${res.error.stack}${colors.reset}`);
            }
          }
        }
      }
    }

    tierSummaries.push({
      tier: `Tier ${tierNum}`,
      name: suite.name,
      total: suiteResults.length,
      passed,
      failed,
      duration: totalDuration,
    });

    if (!options.json) {
      console.log('');
    }

    if (options.bail && failed > 0) {
      break;
    }
  }

  const totalTime = Date.now() - overallStart;
  const totalTests = allResults.length;
  const totalPassed = allResults.filter((r) => r.status === 'pass').length;
  const totalFailed = allResults.filter((r) => r.status === 'fail').length;

  if (options.json) {
    console.log(JSON.stringify({
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      durationMs: totalTime,
      tiers: tierSummaries,
      results: allResults,
    }, null, 2));
  } else {
    // Print Summary Scorecard
    console.log(`${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.white}   E2E TEST EXECUTION SUMMARY SCORECARD${colors.reset}`);
    console.log(`${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
    console.log(`${'Tier / Suite Name'.padEnd(42)} ${'Total'.padStart(7)} ${'Passed'.padStart(8)} ${'Failed'.padStart(8)} ${'Time'.padStart(9)}`);
    console.log(`${'-'.repeat(74)}`);

    for (const ts of tierSummaries) {
      const passColor = ts.passed === ts.total ? colors.green : colors.yellow;
      const failColor = ts.failed > 0 ? colors.red : colors.dim;
      console.log(
        `${ts.name.padEnd(42)} ` +
        `${String(ts.total).padStart(7)} ` +
        `${passColor}${String(ts.passed).padStart(8)}${colors.reset} ` +
        `${failColor}${String(ts.failed).padStart(8)}${colors.reset} ` +
        `${(ts.duration + 'ms').padStart(9)}`
      );
    }

    console.log(`${'-'.repeat(74)}`);
    const finalPassColor = totalFailed === 0 ? colors.green : colors.red;
    console.log(
      `${colors.bold}${'TOTAL (All Suites)'.padEnd(42)} ` +
      `${String(totalTests).padStart(7)} ` +
      `${finalPassColor}${String(totalPassed).padStart(8)}${colors.reset} ` +
      `${totalFailed > 0 ? colors.red : colors.dim}${String(totalFailed).padStart(8)}${colors.reset} ` +
      `${(totalTime + 'ms').padStart(9)}`
    );
    console.log(`${colors.bold}${colors.magenta}========================================================================${colors.reset}`);

    if (totalFailed === 0 && totalTests >= 138) {
      console.log(`\n${colors.bold}${colors.green}🎉 ALL ${totalTests} E2E TESTS PASSED SUCCESSFULLY (100% PASS RATE) 🎉${colors.reset}\n`);
    } else if (totalFailed === 0) {
      console.log(`\n${colors.bold}${colors.green}✔ ALL ${totalTests} SELECTED E2E TESTS PASSED SUCCESSFULLY ✔${colors.reset}\n`);
    } else {
      console.log(`\n${colors.bold}${colors.red}❌ ${totalFailed} TEST(S) FAILED. INSPECT TRACES ABOVE. ❌${colors.reset}\n`);
    }
  }

  process.exitCode = totalFailed === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(`${colors.bgRed}${colors.white} FATAL ERROR IN RUNNER ${colors.reset}`, err);
  process.exit(1);
});
