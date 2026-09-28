// Turns a jscpd JSON report into warnings on the lines, a job summary and a PR comment
// with where to extract each repeated block; fails only with FAIL_ON_CLONES=true.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MARKER = '<!-- inzumer-ci:duplication -->';

/** Where a repeated block of this file usually belongs. */
export const suggestionFor = (file) => {
  if (/\.test\.|__tests__|\.spec\./.test(file)) {
    return 'a test helper or `it.each`';
  }
  if (/\/pages\/|\/layouts\//.test(file) || file.endsWith('.astro')) {
    return 'a shared layout or `.astro` component';
  }
  if (/\/hooks\/|\buse[A-Z]\w*\./.test(file)) {
    return 'a shared hook';
  }
  if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
    return 'a shared component (or a hook for the logic)';
  }
  if (/\.ya?ml$/.test(file)) {
    return 'a reusable workflow or composite action';
  }
  return 'a shared util';
};

const place = ({ name, start, end }) => `${name.replace(/\\/g, '/')}:${start}-${end}`;

/** One entry per clone: both places, its size and the suggestion. */
export const clones = (report) =>
  (report.duplicates ?? []).map((clone) => ({
    first: { ...clone.firstFile, name: clone.firstFile.name.replace(/\\/g, '/') },
    second: { ...clone.secondFile, name: clone.secondFile.name.replace(/\\/g, '/') },
    lines: clone.lines,
    suggestion: suggestionFor(clone.firstFile.name.replace(/\\/g, '/')),
  }));

/** Markdown for the job summary and the PR comment. */
export const duplicationMarkdown = (report) => {
  const list = clones(report);
  const total = report.statistics?.total ?? {};
  if (list.length === 0) {
    return `${MARKER}\n### Duplicated code\n\nNo repeated blocks found. ✅\n`;
  }
  const rows = list.map(
    (c) =>
      `| \`${place(c.first)}\` | \`${place(c.second)}\` | ${c.lines} | Extract to ${c.suggestion} |`,
  );
  return `${MARKER}\n### Duplicated code\n\n${list.length} repeated block(s), ${total.duplicatedLines ?? 0} lines (${total.percentage ?? 0}%).\n\n| First | Second | Lines | Suggestion |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n`;
};

/** GitHub annotations, shown on the lines of the PR diff. */
export const annotations = (report) =>
  clones(report).map(
    (c) =>
      `::warning file=${c.first.name},line=${c.first.start},endLine=${c.first.end},title=Duplicated code::Same ${c.lines} lines as ${place(c.second)}. Extract to ${c.suggestion}.`,
  );

const main = () => {
  const path = process.env.JSCPD_REPORT ?? '.jscpd/jscpd-report.json';
  const report = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  const markdown = duplicationMarkdown(report);
  writeFileSync('duplication-comment.md', markdown);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  }
  for (const line of annotations(report)) {
    process.stdout.write(`${line}\n`);
  }
  if (process.env.FAIL_ON_CLONES === 'true' && clones(report).length > 0) {
    process.exitCode = 1;
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
