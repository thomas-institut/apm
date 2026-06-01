/**
 * @vitest-environment happy-dom
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import $ from 'jquery';
import {TagEditor} from '@/widgets/TagEditor';

function extractHue(hslColor: string): number {
  const match = hslColor.match(/hsl\((\d+)/);
  expect(match).not.toBeNull();
  return Number(match?.[1]);
}

describe('TagEditor', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    // @ts-expect-error test-only global binding
    globalThis.$ = $;
    // @ts-expect-error test-only global binding
    globalThis.jQuery = $;
  });

  it('renders show mode tags without input and forwards events', () => {
    const onClick = vi.fn();
    const onHover = vi.fn();

    new TagEditor({
      containerSelector: '#root',
      idPrefix: 'tag-test',
      tags: ['beta', 'alpha'],
      mode: 'show',
      showInput: false,
      sortTags: false,
      prependTags: false,
      onTagClick: onClick,
      onTagHover: onHover
    });

    expect(document.querySelector('#tag-test-search-field')).toBeNull();
    expect(document.querySelectorAll('#tag-test-tag-list .addedTag')).toHaveLength(2);
    expect(document.querySelectorAll('#tag-test-tag-list .tag-text')).toHaveLength(2);

    const alphaTag = Array.from(document.querySelectorAll('#tag-test-tag-list .addedTag'))
      .find((el) => el.textContent?.includes('alpha')) as HTMLElement;
    expect(alphaTag).toBeDefined();
    const alphaText = alphaTag.querySelector('.tag-text') as HTMLElement;
    const initialStyle = alphaText.getAttribute('style') ?? '';
    expect(alphaTag.style.lineHeight).toBe('1.05em');
    expect(alphaText.style.padding).toBe('2px 5px');

    $(alphaTag).trigger('mouseenter');
    $(alphaTag).trigger('mouseleave');
    $(alphaTag).trigger('click');
    expect(alphaText.getAttribute('style') ?? '').not.toBe(initialStyle);

    expect(onHover).toHaveBeenNthCalledWith(1, 'alpha', true, expect.any(Object));
    expect(onHover).toHaveBeenNthCalledWith(2, 'alpha', false, expect.any(Object));
    expect(onClick).toHaveBeenNthCalledWith(1, 'alpha', true, expect.any(Object));

    $(alphaTag).trigger('click');
    expect(onClick).toHaveBeenNthCalledWith(2, 'alpha', false, expect.any(Object));
  });

  it('builds deterministic tag colors and split backgrounds', () => {
    const editor = Object.create(TagEditor.prototype) as TagEditor;
    const alphaPalette = editor.getTagColorPalette('alpha');
    const betaPalette = editor.getTagColorPalette('beta');

    expect(alphaPalette.highlightBackground).not.toBe(betaPalette.highlightBackground);
    expect(extractHue(alphaPalette.highlightBackground)).toBeGreaterThanOrEqual(12);
    expect(extractHue(alphaPalette.highlightBackground)).toBeLessThanOrEqual(131);
    expect(extractHue(betaPalette.highlightBackground)).toBeGreaterThanOrEqual(12);
    expect(extractHue(betaPalette.highlightBackground)).toBeLessThanOrEqual(131);
    expect(editor.getTagColor(['alpha'])).toBe(alphaPalette.highlightBackground);
    expect(editor.getTagColor(['alpha', 'beta'])).toContain('linear-gradient');
    expect(editor.getTagColor(['alpha', 'beta'])).toContain(alphaPalette.highlightBackground);
    expect(editor.getTagColor(['alpha', 'beta'])).toContain(betaPalette.highlightBackground);
  });

  it('renders the add tag field after existing tags in edit mode', async () => {
    new TagEditor({
      containerSelector: '#root',
      idPrefix: 'tag-edit',
      tags: ['beta', 'alpha'],
      mode: 'edit',
      getTagHints: async () => [],
      saveTags: async () => undefined
    });

    await Promise.resolve();
    await Promise.resolve();

    const tagList = document.querySelector('#tag-edit-tag-list');
    expect(tagList).toBeDefined();
    expect(tagList?.lastElementChild?.classList.contains('tagAdd')).toBe(true);
  });

  it('applies the individual palette when adding a tag in edit mode', async () => {
    new TagEditor({
      containerSelector: '#root',
      idPrefix: 'tag-edit',
      tags: [],
      mode: 'edit',
      getTagHints: async () => [],
      saveTags: async () => undefined
    });

    await Promise.resolve();
    await Promise.resolve();

    const input = document.querySelector('#tag-edit-search-field') as HTMLInputElement;
    expect(input).toBeDefined();

    input.value = 'alpha';
    $(input).trigger($.Event('keypress', { which: 13 }));

    const tagText = document.querySelector('#tag-edit-alpha-item .tag-text') as HTMLElement;
    expect(tagText).toBeDefined();
    const editor = Object.create(TagEditor.prototype) as TagEditor;
    expect(tagText.getAttribute('style') ?? '').toContain(editor.getTagColorPalette('alpha').chipBackground);
  });
});
