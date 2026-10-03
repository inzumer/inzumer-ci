import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { coverageTable, MARKER, meetsMinimum } from '../coverage-report.mjs';

const summary = {
  total: {
    lines: { total: 200, covered: 190, pct: 95 },
    statements: { total: 210, covered: 199, pct: 94.76 },
    functions: { total: 40, covered: 38, pct: 95 },
    branches: { total: 80, covered: 70, pct: 87.5 },
  },
};

describe('coverage report', () => {
  it('should build a table with every metric and a marker to update the PR comment', () => {
    const table = coverageTable(summary);
    assert.ok(table.startsWith(MARKER));
    assert.match(table, /\| lines \| 95% \| 190 \/ 200 \|/);
    assert.match(table, /\| branches \| 87\.5% \| 70 \/ 80 \|/);
    assert.doesNotMatch(table, /Minimum/);
  });

  it('should mark the line coverage against the minimum', () => {
    assert.match(coverageTable(summary, 90), /\| lines \| 95% ✅ \|/);
    assert.match(coverageTable(summary, 96), /\| lines \| 95% ❌ \|/);
    assert.match(coverageTable(summary, 90), /Minimum line coverage: 90%\./);
  });

  it('should pass or fail the minimum on line coverage', () => {
    assert.equal(meetsMinimum(summary, 90), true);
    assert.equal(meetsMinimum(summary, 96), false);
    assert.equal(meetsMinimum(summary), true);
    assert.equal(meetsMinimum({}, 1), false);
  });
});
