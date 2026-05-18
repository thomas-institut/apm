/**
 * @vitest-environment happy-dom
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';
import $ from 'jquery';
import {TagEditor} from '@/widgets/TagEditor';

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
    const initialBackground = alphaText.style.background;

    $(alphaTag).trigger('mouseenter');
    $(alphaTag).trigger('mouseleave');
    $(alphaTag).trigger('click');
    expect(alphaText.style.background).not.toBe(initialBackground);

    expect(onHover).toHaveBeenNthCalledWith(1, 'alpha', true, expect.any(Object));
    expect(onHover).toHaveBeenNthCalledWith(2, 'alpha', false, expect.any(Object));
    expect(onClick).toHaveBeenNthCalledWith(1, 'alpha', true, expect.any(Object));

    $(alphaTag).trigger('click');
    expect(onClick).toHaveBeenNthCalledWith(2, 'alpha', false, expect.any(Object));
    expect(alphaText.style.background).toBe(initialBackground);
  });
});
