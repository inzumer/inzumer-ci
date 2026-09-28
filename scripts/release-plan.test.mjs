import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bumpFor, nextVersion, releaseNotes, relevantCommits, versionOf } from './release-plan.mjs';

const commit = (subject, body = '') => ({ subject, body });

describe('release plan', () => {
  it('should read the version of a tag', () => {
    assert.equal(versionOf('v1.16.0'), '1.16.0');
    assert.equal(versionOf(''), '0.0.0');
  });

  it('should ignore release commits', () => {
    assert.deepEqual(relevantCommits([commit('chore(release): 1.2.0'), commit('fix: a')]), [
      commit('fix: a'),
    ]);
  });

  it('should pick the bump from Conventional Commits', () => {
    assert.equal(bumpFor([commit('fix: a'), commit('docs: b')]), 'patch');
    assert.equal(bumpFor([commit('fix: a'), commit('feat(ui): b')]), 'minor');
    assert.equal(bumpFor([commit('feat!: drop x')]), 'major');
    assert.equal(bumpFor([commit('refactor(api)!: rename')]), 'major');
    assert.equal(bumpFor([commit('fix: a', 'BREAKING CHANGE: new route')]), 'major');
  });

  it('should compute the next version', () => {
    assert.equal(nextVersion('1.16.0', 'patch'), '1.16.1');
    assert.equal(nextVersion('1.16.3', 'minor'), '1.17.0');
    assert.equal(nextVersion('1.16.3', 'major'), '2.0.0');
  });

  it('should group the notes by type', () => {
    const notes = releaseNotes([
      commit('feat: agenda'),
      commit('chore(deps): bump vite'),
      commit('fix: menu'),
    ]);
    assert.equal(
      notes,
      '### Novedades\n\n- feat: agenda\n\n### Correcciones\n\n- fix: menu\n\n### Mantenimiento\n\n- chore(deps): bump vite',
    );
  });
});
