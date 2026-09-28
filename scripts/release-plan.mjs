// Decides whether there is something to release from `dev` and with which version, following
// Conventional Commits since the last `v*` tag. Used by .github/workflows/release.yml.
import { execSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BREAKING = /^\w+(\([^)]*\))?!:/;
const BUMPS = ['patch', 'minor', 'major'];

const SECTIONS = [
  { type: 'feat', title: 'Novedades' },
  { type: 'fix', title: 'Correcciones' },
  { type: 'perf', title: 'Rendimiento' },
  { type: 'refactor', title: 'Refactors' },
  { type: 'content', title: 'Contenido' },
  { type: 'docs', title: 'Documentación' },
];

/** `1.16.0` from `v1.16.0`; `0.0.0` when there is no tag yet. */
export const versionOf = (tag) => (tag ? tag.replace(/^v/, '') : '0.0.0');

/** Commits that count for a release: release commits themselves don't. */
export const relevantCommits = (commits) =>
  commits.filter(({ subject }) => !/^chore\(release\)/.test(subject));

/** `major` for breaking changes, `minor` for features, `patch` for anything else. */
export const bumpFor = (commits) => {
  if (commits.some(({ subject, body }) => BREAKING.test(subject) || /BREAKING CHANGE/.test(body))) {
    return 'major';
  }
  return commits.some(({ subject }) => /^feat(\(|:|!)/.test(subject)) ? 'minor' : 'patch';
};

export const nextVersion = (current, bump) => {
  const [major = 0, minor = 0, patch = 0] = current.split('.').map(Number);
  if (bump === 'major') {
    return `${major + 1}.0.0`;
  }
  if (bump === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
};

/** Release notes in Markdown, grouped by commit type. */
export const releaseNotes = (commits) => {
  const typeOf = (subject) => /^(\w+)/.exec(subject)?.[1] ?? '';
  const known = new Set(SECTIONS.map(({ type }) => type));
  const groups = [
    ...SECTIONS.map(({ type, title }) => ({
      title,
      items: commits.filter(({ subject }) => typeOf(subject) === type),
    })),
    {
      title: 'Mantenimiento',
      items: commits.filter(({ subject }) => !known.has(typeOf(subject))),
    },
  ];
  return groups
    .filter(({ items }) => items.length > 0)
    .map(({ title, items }) =>
      [`### ${title}`, '', ...items.map(({ subject }) => `- ${subject}`)].join('\n'),
    )
    .join('\n\n');
};

const git = (command) => execSync(`git ${command}`, { encoding: 'utf8' }).trim();

const readCommits = (range) =>
  git(`log ${range} --no-merges --format=%s%x1f%b%x1e`)
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [subject = '', body = ''] = entry.split('\x1f');
      return { subject: subject.trim(), body: body.trim() };
    });

const main = () => {
  const ref = process.env.RELEASE_REF ?? 'origin/dev';
  const forced = process.env.RELEASE_BUMP ?? 'auto';
  const tag = git('tag --list "v*" --sort=-v:refname').split('\n')[0] ?? '';
  const commits = relevantCommits(readCommits(tag ? `${tag}..${ref}` : ref));
  const release = commits.length > 0;
  const bump = BUMPS.includes(forced) ? forced : bumpFor(commits);
  const version = release ? nextVersion(versionOf(tag), bump) : '';

  writeFileSync('release-notes.md', release ? releaseNotes(commits) : '');
  const outputs = { release: String(release), version, bump, 'last-tag': tag };
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  const text = `${lines.join('\n')}\n`;
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, text);
  }
  process.stdout.write(text);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
