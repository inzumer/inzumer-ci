# CLAUDE.md

`inzumer-ci`: reusable GitHub Actions workflows (`workflow_call`) and their scripts, used by every
Inzumer repository. Shared repositories follow `inzumer-<name>`; see README.md for each workflow.

- Callers pin `@v1`: a change that breaks an input, output or behavior needs a new major tag
  (`v2`). After merging a compatible change, move `v1` to the new commit (`git tag -f v1 && git push -f origin v1`).
- Scripts run from a checkout of this repository in `.inzumer-ci/` (the `ci-ref` input); keep them
  dependency-free Node (`.mjs`) or Bash, with `node:test` tests.
- Every workflow and template must pass the GitHub Actions schema (CI runs `@action-validator/cli`).
- Update `templates/` and the README with any input change.
- Conventional Commits; branches and PRs to `main`. Never commit or push unless asked.
