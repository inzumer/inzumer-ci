import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { annotations, duplicationMarkdown, MARKER, suggestionFor } from '../duplication-report.mjs';

const report = {
  statistics: { total: { duplicatedLines: 22, percentage: 0.4 } },
  duplicates: [
    {
      lines: 22,
      firstFile: { name: 'src\\components\\A.tsx', start: 10, end: 31 },
      secondFile: { name: 'src/components/B.tsx', start: 40, end: 61 },
    },
  ],
};

describe('duplication report', () => {
  it('should suggest where each kind of file extracts its repeated code', () => {
    assert.match(suggestionFor('src/pages/[lang]/a.astro'), /layout/);
    assert.match(suggestionFor('src/hooks/useThing/useThing.ts'), /hook/);
    assert.match(suggestionFor('src/components/A.tsx'), /component/);
    assert.match(suggestionFor('src/utils/a.ts'), /util/);
    assert.match(suggestionFor('src/a/__tests__/a.test.ts'), /test helper/);
    assert.match(suggestionFor('.github/workflows/ci.yml'), /workflow/);
  });

  it('should list every clone with both places and a marker to update the PR comment', () => {
    const markdown = duplicationMarkdown(report);
    assert.ok(markdown.startsWith(MARKER));
    assert.match(
      markdown,
      /`src\/components\/A.tsx:10-31` \| `src\/components\/B.tsx:40-61` \| 22/,
    );
    assert.match(markdown, /0.4%/);
  });

  it('should say when there is nothing repeated', () => {
    assert.match(duplicationMarkdown({}), /No repeated blocks found/);
  });

  it('should annotate the first place of each clone', () => {
    assert.deepEqual(annotations(report), [
      '::warning file=src/components/A.tsx,line=10,endLine=31,title=Duplicated code::Same 22 lines as src/components/B.tsx:40-61. Extract to a shared component (or a hook for the logic).',
    ]);
  });
});
