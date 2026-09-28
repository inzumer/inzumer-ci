#!/usr/bin/env bash
# After release/<VERSION> lands on the production branch: tag vVERSION, publish the GitHub
# Release, open and merge the backport PR to the development branch (left open on conflict),
# delete the release branch and, optionally, start a deploy workflow.
#
# Runs inside a checkout of the production branch (fetch-depth: 0).
# Env: VERSION, DEVELOPMENT_BRANCH, PRODUCTION_BRANCH, DEPLOY_WORKFLOW (optional), GH_TOKEN.
set -euo pipefail

VERSION="${VERSION#release/}"
git config user.name 'github-actions[bot]'
git config user.email '41898283+github-actions[bot]@users.noreply.github.com'
git fetch --quiet origin "$PRODUCTION_BRANCH" "$DEVELOPMENT_BRANCH" --tags
git checkout --quiet -B "$PRODUCTION_BRANCH" "origin/$PRODUCTION_BRANCH"

if ! git rev-parse "v$VERSION" >/dev/null 2>&1; then
  git tag -a "v$VERSION" -m "v$VERSION"
  git push origin "v$VERSION"
fi
gh release view "v$VERSION" >/dev/null 2>&1 ||
  gh release create "v$VERSION" --title "v$VERSION" --generate-notes --verify-tag

if ! git merge-base --is-ancestor HEAD "origin/$DEVELOPMENT_BRANCH"; then
  branch="backport/v$VERSION"
  git push -f origin "HEAD:refs/heads/$branch"
  url=$(gh pr view "$branch" --json url --jq .url 2>/dev/null ||
    gh pr create --base "$DEVELOPMENT_BRANCH" --head "$branch" \
      --title "chore(release): backport v$VERSION to $DEVELOPMENT_BRANCH" \
      --body "Automatic backport of v$VERSION from $PRODUCTION_BRANCH.")
  gh pr merge "$url" --merge --subject "Merge branch 'release/$VERSION' into $DEVELOPMENT_BRANCH" ||
    echo "::warning::Backport PR left open (conflict?): $url"
fi
git push origin --delete "release/$VERSION" 2>/dev/null || true

if [ -n "${DEPLOY_WORKFLOW:-}" ]; then
  gh workflow run "$DEPLOY_WORKFLOW" --ref "$PRODUCTION_BRANCH"
fi
