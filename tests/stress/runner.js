/**
 * Master Stress & Adversarial Test Runner for VTT Asal Jadi
 * Challenger Gen 2 Empirical Verification
 */

import { createSocketTelemetryStressSuite } from './socket_telemetry.stress.test.js';
import { createObsOverlayStressSuite } from './obs_overlay.stress.test.js';
import { createBackendRecommendationsValidatorSuite } from './backend_recommendations_validator.test.js';

async function runAllStressSuites() {
  console.log('========================================================================');
  console.log('   VTT ASAL JADI — EMPIRICAL STRESS & ADVERSARIAL TEST SUITE');
  console.log('   Challenger Gen 2 Verification Execution');
  console.log('========================================================================\n');

  const suites = [
    createSocketTelemetryStressSuite(),
    createObsOverlayStressSuite(),
    createBackendRecommendationsValidatorSuite(),
  ];

  const scorecard = [];
  let grandTotal = 0;
  let grandPassed = 0;
  let grandFailed = 0;
  const overallStart = Date.now();

  for (const suite of suites) {
    console.log(`▶ Running Suite: ${suite.name}`);
    const suiteStart = Date.now();
    const results = await suite.run();
    const suiteDuration = Date.now() - suiteStart;

    let passed = 0;
    let failed = 0;

    for (const res of results) {
      if (res.status === 'pass') {
        passed++;
        console.log(`  ✔ [${res.id}] ${res.name} (${res.duration}ms)`);
      } else {
        failed++;
        console.error(`  ✖ [${res.id}] ${res.name} (${res.duration}ms)`);
        console.error(`    Error: ${res.error?.message || res.error}`);
        if (res.error?.stack) {
          console.error(`    ${res.error.stack.split('\n').slice(1, 4).join('\n    ')}`);
        }
      }
    }

    console.log('');
    scorecard.push({
      name: suite.name,
      total: results.length,
      passed,
      failed,
      duration: suiteDuration,
    });

    grandTotal += results.length;
    grandPassed += passed;
    grandFailed += failed;
  }

  const overallDuration = Date.now() - overallStart;

  console.log('========================================================================');
  console.log('   STRESS TEST EXECUTION SCORECARD');
  console.log('========================================================================');
  console.log(
    'Suite Name'.padEnd(52) +
    'Total'.padStart(7) +
    'Passed'.padStart(9) +
    'Failed'.padStart(9) +
    'Time'.padStart(9)
  );
  console.log('-'.repeat(86));

  for (const s of scorecard) {
    console.log(
      s.name.padEnd(52) +
      String(s.total).padStart(7) +
      String(s.passed).padStart(9) +
      String(s.failed).padStart(9) +
      `${s.duration}ms`.padStart(9)
    );
  }

  console.log('-'.repeat(86));
  console.log(
    'TOTAL (All Stress Suites)'.padEnd(52) +
    String(grandTotal).padStart(7) +
    String(grandPassed).padStart(9) +
    String(grandFailed).padStart(9) +
    `${overallDuration}ms`.padStart(9)
  );
  console.log('========================================================================\n');

  if (grandFailed === 0) {
    console.log(`🎉 ALL ${grandTotal} STRESS & ADVERSARIAL TESTS PASSED (100% PASS RATE) 🎉\n`);
    process.exit(0);
  } else {
    console.error(`❌ STRESS VERIFICATION FAILED: ${grandFailed} OF ${grandTotal} TESTS FAILED ❌\n`);
    process.exit(1);
  }
}

runAllStressSuites().catch((err) => {
  console.error('Fatal test runner exception:', err);
  process.exit(1);
});
