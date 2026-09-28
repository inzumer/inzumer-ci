// Turns an Istanbul `coverage-summary.json` (Vitest `json-summary` reporter, Jest
// `--coverageReporters=json-summary`) into a Markdown table for the job summary and the PR
// comment, and fails when line coverage is under MIN_LINE_COVERAGE.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MARKER = '<!-- inzumer-ci:coverage -->';
const METRICS = ['lines', 'statements', 'functions', 'branches'];

/** Markdown table of the total coverage, with the minimum when there is one. */
export const coverageTable = (summary, minLines = 0) => {
  const rows = METRICS.map((metric) => {
    const { pct = 0, covered = 0, total = 0 } = summary.total?.[metric] ?? {};
    const mark = metric === 'lines' && minLines > 0 ? (pct >= minLines ? ' ✅' : ' ❌') : '';
    return `| ${metric} | ${pct}%${mark} | ${covered} / ${total} |`;
  });
  const gate = minLines > 0 ? `\n\nMinimum line coverage: ${minLines}%.` : '';
  return `${MARKER}\n### Coverage\n\n| Metric | % | Covered |\n| --- | --- | --- |\n${rows.join('\n')}${gate}\n`;
};

export const meetsMinimum = (summary, minLines = 0) => (summary.total?.lines?.pct ?? 0) >= minLines;

const main = () => {
  const path = process.env.COVERAGE_SUMMARY ?? 'coverage/coverage-summary.json';
  if (!existsSync(path)) {
    process.stdout.write(`No coverage summary at ${path}; skipping.\n`);
    return;
  }
  const summary = JSON.parse(readFileSync(path, 'utf8'));
  const minLines = Number(process.env.MIN_LINE_COVERAGE ?? 0);
  const table = coverageTable(summary, minLines);
  writeFileSync('coverage-comment.md', table);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, table);
  }
  process.stdout.write(table);
  if (!meetsMinimum(summary, minLines)) {
    process.stderr.write(`Line coverage is under ${minLines}%.\n`);
    process.exitCode = 1;
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
