/**
 * Micro-benchmark of the cost centres of a quick apparatus edit (see
 * docs/issues/171 - React EditionComposer/apparatus-quick-editing-proposal.md, section 6.1):
 *
 *   1. deepCopy of the state          (every history action does this today)
 *   2. state signature                (JSON.stringify + hash, done by StateHistory.do)
 *   3. edition generation             (CtDataEditionGenerator.generateEdition)
 *
 * and the sum of the three, which is what the user waits for (React rendering excluded).
 *
 * Run with `npm run bench` (from apps/apm/www). A per-stage breakdown of the edition generation, taken
 * from the dev measurement points, is printed after each size group.
 */
import {bench, describe} from 'vitest';
import {CtDataEditionGenerator} from '@/Edition/EditionGenerator/CtDataEditionGenerator';
import {hashString} from '@/ReactAPM/ToolBox/Hash';
import {deepCopy} from '@/toolbox/Util';
import {clearPerfRecords, getPerfSummary} from '@/toolbox/PerfMeasure';
import {
  createLargeCtData,
  LARGE_CT_DATA,
  LargeCtDataOptions,
  MEDIUM_CT_DATA,
  SMALL_CT_DATA,
  withToggledCustomSubEntry
} from './LargeCtDataFixture';

const BENCH_OPTIONS = {iterations: 5, warmupIterations: 1, time: 0, warmupTime: 0};

function printBreakdown(label: string) {
  const rows = getPerfSummary()
    .filter((s) => s.name.startsWith('edition.generate'))
    .sort((a, b) => b.meanMs - a.meanMs)
    .map((s) => ({stage: s.name, runs: s.count, 'mean ms': +s.meanMs.toFixed(2), 'max ms': +s.maxMs.toFixed(2)}));
  console.log(`\n[${label}] edition generation breakdown (dev measurement points)`);
  console.table(rows);
  clearPerfRecords();
}

function defineGroup(label: string, options: LargeCtDataOptions) {
  describe(label, () => {
    const ctData = createLargeCtData(options);
    const state = {ctData};
    const toggled = withToggledCustomSubEntry(ctData, 1);
    console.log(`[${label}] ${options.numWitnesses} witnesses x ${options.numColumns} columns, ` +
      `${options.numCustomEntries} custom entries, JSON size ${(JSON.stringify(state).length / 1e6).toFixed(2)} MB`);

    bench('deepCopy(state)', () => {
      deepCopy(state);
    }, BENCH_OPTIONS);

    bench('state signature (JSON.stringify + hashString)', () => {
      hashString(JSON.stringify(state));
    }, BENCH_OPTIONS);

    bench('generateEdition', () => {
      new CtDataEditionGenerator({ctData}).generateEdition();
    }, {...BENCH_OPTIONS, setup: () => clearPerfRecords(), teardown: () => printBreakdown(label)});

    bench('whole pipeline: deepCopy + signature + generateEdition (one sub-entry toggle)', () => {
      const newState = deepCopy(state);
      newState.ctData = toggled;
      hashString(JSON.stringify(newState));
      new CtDataEditionGenerator({ctData: newState.ctData}).generateEdition();
    }, BENCH_OPTIONS);
  });
}

defineGroup('small', SMALL_CT_DATA);
defineGroup('medium', MEDIUM_CT_DATA);
defineGroup('large', LARGE_CT_DATA);
