import {describe, expect, it} from 'vitest';
import {MainText} from '@/Edition/MainText';
import {MainTextTokenFactory} from '@/Edition/MainTextTokenFactory';

describe('MainText.getParagraphs', () => {
  it('splits tokens into paragraphs on paragraph_end', () => {
    const paragraphs = MainText.getParagraphs([
      MainTextTokenFactory.createSimpleText('text', 'a', 0),
      MainTextTokenFactory.createParagraphEnd('h1'),
      MainTextTokenFactory.createSimpleText('text', 'b', 1),
    ]);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].type).toBe('h1');
    expect(paragraphs[0].tokens).toHaveLength(1);
    expect(paragraphs[0].breakAfter).toBeUndefined();
    expect(paragraphs[1].type).toBe('normal');
    expect(paragraphs[1].breakAfter).toBeUndefined();
  });

  it.each([
    ['section', MainTextTokenFactory.createSectionBreak],
    ['page', MainTextTokenFactory.createPageBreak],
  ])('attaches a %s break to the previous paragraph', (breakType, factory) => {
    const tokens = [
      MainTextTokenFactory.createSimpleText('text', 'a', 0),
      MainTextTokenFactory.createParagraphEnd(),
      factory(),
      MainTextTokenFactory.createSimpleText('text', 'b', 1),
    ];
    const paragraphs = MainText.getParagraphs(tokens);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].breakAfter).toBe(breakType);
    expect(paragraphs[1].breakAfter).toBeUndefined();
    paragraphs.forEach((p) => {
      p.tokens.forEach((t) => {
        expect(t.type).not.toBe('section_break');
        expect(t.type).not.toBe('page_break');
      });
    });
    expect(paragraphs[1].tokens[0].originalIndex).toBe(3);
  });

  it('ignores break tokens before any paragraph', () => {
    const paragraphs = MainText.getParagraphs([
      MainTextTokenFactory.createPageBreak(),
      MainTextTokenFactory.createSimpleText('text', 'a', 0),
    ]);
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].tokens).toHaveLength(1);
    expect(paragraphs[0].breakAfter).toBeUndefined();
  });
});
