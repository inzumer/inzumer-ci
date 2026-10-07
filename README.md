# inzumer-ci

Reusable GitHub Actions workflows shared by every Inzumer repository (Milimon, Zamuner, the
`inzumer-*` packages…), so CI and releases are written once. Callers use them with one `uses:`
line pinned to the major tag:

```yaml
uses: inzumer/inzumer-ci/.github/workflows/<workflow>.yml@v1
```

Ready-to-copy callers live in [`templates/`](./templates).

## Workflows

| Workflow                 | What it does                                                                                                                                                  | Caller template                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `node-ci.yml`            | Checkout, install (pnpm or npm), optional **dependency audit**, your checks, and an optional **coverage report** (job summary, artifact, PR comment, minimum) | `templates/workflows/ci.yml`              |
| `security.yml`           | **Dependency analysis**: `audit` at a level (also on a schedule) and GitHub's dependency review on PRs                                                        | `templates/workflows/security.yml`        |
| `duplication.yml`        | **Duplicated code** (jscpd): warnings on the repeated lines and a PR comment with where to extract each block; only warns unless `fail-on-clones`             | `templates/workflows/duplication.yml`     |
| `a11y.yml`               | **Accessibility**: build, serve (static folder or own server) and audit each page with axe (pa11y-ci)                                                         | `templates/workflows/a11y.yml`            |
| `changesets-release.yml` | npm packages: "Version Packages" PR, then publish with provenance (trusted publishing or `NPM_TOKEN`)                                                         | `templates/workflows/package-release.yml` |
| `release-prepare.yml`    | Weekly gitflow release, step 1: cut `release/X.Y.Z` and open the PR (or close stale ones)                                                                     | `templates/workflows/release-prepare.yml` |
| `release-find.yml`       | Step 2: find the open release PR at the local hour                                                                                                            | `templates/workflows/release-publish.yml` |
| `release-merge.yml`      | Step 3: merge, tag, GitHub Release, backport to the development branch, optional deploy                                                                       | `templates/workflows/release-publish.yml` |
| `release-finish.yml`     | A release PR merged by hand: tag, GitHub Release and backport                                                                                                 | `templates/workflows/release-finish.yml`  |

## Shared practices

| Practice            | How                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Version bumps       | Weekly gitflow release (apps) or Changesets (packages); the version comes from Conventional Commits                      |
| Dependency analysis | `node-ci` `audit-level` on every run, `security.yml` weekly and on PRs; dependencies are updated by hand (no Dependabot) |
| Coverage            | Each repo keeps its thresholds in Vitest or Jest; `node-ci` `coverage-summary` reports it on every run and PR            |
| Duplicated code     | `duplication.yml` on every PR: repeated blocks become warnings with a suggestion (component, hook, util, layout)         |
| Accessibility       | `a11y.yml` (axe on the main pages); Milimon keeps its full-site audit and `ui-library` Storybook's addon                 |

**Coverage report:** add the `json-summary` reporter (Vitest:
`coverage.reporter: ['text', 'lcov', 'json-summary']`; Jest: `coverageReporters`) and pass
`coverage-summary: coverage/coverage-summary.json`. The PR comment is updated in place on every
push; grant `pull-requests: write` in the caller.

**Dependency review** (`security.yml`) needs GitHub Advanced Security on private repositories;
set `dependency-review: false` there.

## Weekly releases (gitflow)

- **Friday at noon** (Madrid): if the development branch has commits since the last `v*` tag,
  `release/X.Y.Z` is cut with the version from Conventional Commits (`feat` → minor, `!` or
  `BREAKING CHANGE` → major, anything else → patch), `package.json` is bumped and the PR to `main`
  is opened; the caller runs its own CI on it. With no changes, stale release PRs are closed.
- **Monday at noon**: CI again, merge, tag `vX.Y.Z`, GitHub Release and an automatic **backport** PR
  to the development branch (merged at once; left open on conflict). If the deploy is a workflow in
  the repository (e.g. GitHub Pages), pass it as `deploy-workflow`.
- GitHub schedules are UTC only: callers declare two crons (summer and winter) and
  `scripts/schedule-gate/schedule-gate.mjs` keeps the one at the local hour (`time-zone`, `local-hour` inputs).
- The development branch is an input (`develop` by default; Milimon uses `dev`).
- Set the repository variable `RELEASE_AUTO_MERGE=false` to merge release PRs by hand.

**Repository settings** for callers: Settings → Actions → General → "Read and write permissions"
and "Allow GitHub Actions to create and approve pull requests"; Settings → General →
"Automatically delete head branches".

## Dependencies

Dependencies are updated **by hand**, so no repository keeps a `.github/dependabot.yml` (it only
leaves automated PRs open). GitHub vulnerability alerts stay on, and `node-ci` with
`audit-level: low` fails on any vulnerability.

## Publishing to npm

`changesets-release.yml` publishes with npm **trusted publishing**: no secret to store or rotate.
For each package, once it exists on npm (the first version is published by hand), open
npmjs.com → the package → **Settings → Trusted Publisher → GitHub Actions** and fill in:

| Field             | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| Organization/user | `inzumer`                                                 |
| Repository        | the package repository, e.g. `inzumer-tokens`             |
| Workflow filename | the **calling** workflow in that repo, e.g. `release.yml` |
| Environment       | empty                                                     |

The caller grants `id-token: write`. An `NPM_TOKEN` secret (with `secrets: inherit`) still
works for repositories without trusted publishing.

## Versioning

Tags `vX.Y.Z` plus a moving major tag (`v1`). Breaking changes to inputs or behavior go to a new
major (`v2`), so callers upgrade on purpose. Keep the `ci-ref` input equal to the ref in `uses:`
(both default to `v1`).

**v2** only changes `changesets-release.yml`: it runs `changesets/action` v2, which needs the
**Changesets CLI v3** (`@changesets/cli` ^3, Node ^22.11 or ^24; the `prettier` option of
`.changeset/config.json` became `format`). Packages still on CLI v2 keep
`changesets-release.yml@v1`; the other workflows are the same in both.

## Development

`node --test "scripts/**/__tests__/*.test.mjs"` tests the scripts; CI also validates every workflow and
template against the GitHub Actions schema.
