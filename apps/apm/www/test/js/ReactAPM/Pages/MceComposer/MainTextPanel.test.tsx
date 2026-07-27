/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import MainTextPanel from '@/ReactAPM/Pages/MceComposer/MainTextPanel/MainTextPanel';
import {Edition} from '@/Edition/Edition';
import {MainTextToken} from '@/Edition/MainTextToken';

vi.mock('react-bootstrap', () => ({
  Button: ({children, ...props}: any) => <button {...props}>{children}</button>
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const makeTextToken = (text: string): MainTextToken => new MainTextToken().setText(text);

const makeGlueToken = (text: string): MainTextToken => {
  const token = new MainTextToken().setText(text);
  token.type = 'glue';
  return token;
};

const makeChunkStartToken = (chunkId: string): MainTextToken => {
  const token = new MainTextToken();
  token.type = 'chunk_start';
  token.chunkId = chunkId;
  return token;
};

const makeParagraphEndToken = (style = ''): MainTextToken => {
  const token = new MainTextToken();
  token.type = 'paragraph_end';
  token.style = style;
  return token;
};

describe('MainTextPanel', () => {
  it('renders chunk start as marginal note marker with diamond icon and label', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const edition = new Edition().setLang('en').setMainText([
      makeChunkStartToken('chunk-12'),
      makeTextToken('Hello'),
      makeGlueToken(' '),
      makeTextToken('world'),
      makeParagraphEndToken()
    ]);

    await act(async () => {
      root.render(
        <MainTextPanel
          edition={edition}
          generationProgress={null}
          editionOutOfDate={false}
          onClickRegenerate={vi.fn()}
        />
      );
    });

    expect(container.querySelector('.main-text-content')?.textContent).toContain('Hello world');
    expect(container.querySelector('.chunk-mark-label')?.textContent).toBe('chunk-12');
    expect(container.querySelector('.chunk-mark-icon')).not.toBeNull();
  });
});
