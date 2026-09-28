# inzumer-ci

Reusable GitHub Actions workflows shared by every Inzumer repository (Milimon, Zamuner, the
`inzumer-*` packages…), so CI and releases are written once. Callers use them with one `uses:`
line pinned to the major tag:

```yaml
uses: inzumer/inzumer-ci/.github/workflows/<workflow>.yml@v1
```

Ready-to-copy callers live in [`templates/`](./templates).

## Workflows

| Workflow                 | What it does                                                                                    | Caller template                           |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `node-ci.yml`            | Checkout, `pnpm install --frozen-lockfile` or `npm ci`, then your checks (one command per line) | `templates/workflows/ci.yml`              |
| `changesets-release.yml` | npm packages: "Version Packages" PR, then publish with provenance (`NPM_TOKEN` secret)          | `templates/workflows/package-release.yml` |
| `release-prepare.yml`    | Weekly gitflow release, step 1: cut `release/X.Y.Z` and open the PR (or close stale ones)       | `templates/workflows/release-prepare.yml` |
| `release-find.yml`       | Step 2: find the open release PR at the local hour                                              | `templates/workflows/release-publish.yml` |
| `release-merge.yml`      | Step 3: merge, tag, GitHub Release, backport to the development branch, optional deploy         | `templates/workflows/release-publish.yml` |
| `release-finish.yml`     | A release PR merged by hand: tag, GitHub Release and backport                                   | `templates/workflows/release-finish.yml`  |

## Weekly releases (gitflow)

- **Friday at noon** (Madrid): if the development branch has commits since the last `v*` tag,
  `release/X.Y.Z` is cut with the version from Conventional Commits (`feat` → minor, `!` or
  `BREAKING CHANGE` → major, anything else → patch), `package.json` is bumped and the PR to `main`
  is opened; the caller runs its own CI on it. With no changes, stale release PRs are closed.
- **Monday at noon**: CI again, merge, tag `vX.Y.Z`, GitHub Release and an automatic **backport** PR
  to the development branch (merged at once; left open on conflict). If the deploy is a workflow in
  the repository (e.g. GitHub Pages), pass it as `deploy-workflow`.
- GitHub schedules are UTC only: callers declare two crons (summer and winter) and
  `scripts/schedule-gate.mjs` keeps the one at the local hour (`time-zone`, `local-hour` inputs).
- The development branch is an input (`develop` by default; Milimon uses `dev`).
- Set the repository variable `RELEASE_AUTO_MERGE=false` to merge release PRs by hand.

**Repository settings** for callers: Settings → Actions → General → "Read and write permissions"
and "Allow GitHub Actions to create and approve pull requests"; Settings → General →
"Automatically delete head branches".

## Dependabot

Dependabot's configuration can't be shared across repositories, so each one keeps its own
`.github/dependabot.yml`. Copy [`templates/dependabot.yml`](./templates/dependabot.yml): npm and
GitHub Actions on the **1st and 15th of each month**, minor and patch updates grouped.

## Versioning

Tags `vX.Y.Z` plus a moving major tag (`v1`). Breaking changes to inputs or behavior go to a new
major (`v2`), so callers upgrade on purpose. Keep the `ci-ref` input equal to the ref in `uses:`
(both default to `v1`).

## Development

`node --test "scripts/*.test.mjs"` tests the scripts; CI also validates every workflow and
template against the GitHub Actions schema.
