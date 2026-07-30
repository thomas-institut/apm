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

const makeChunkEndToken = (chunkId: string): MainTextToken => {
  const token = new MainTextToken();
  token.type = 'chunk_end';
  token.chunkId = chunkId;
  return token;
};

const makeParagraphEndToken = (style = ''): MainTextToken => {
  const token = new MainTextToken();
  token.type = 'paragraph_end';
  token.style = style;
  return token;
};

const renderMainTextPanel = async ({
                                     edition,
                                     generationProgress,
                                     editionOutOfDate,
                                     onClickRegenerate = vi.fn()
                                   }: {
  edition: Edition | null;
  generationProgress: number | null;
  editionOutOfDate: boolean;
  onClickRegenerate?: () => void | Promise<void>;
}) => {
  document.body.innerHTML = '<div id="root"></div>';
  const container = document.getElementById('root')!;
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MainTextPanel
        edition={edition}
        generationProgress={generationProgress}
        editionOutOfDate={editionOutOfDate}
        onClickRegenerate={onClickRegenerate}
      />
    );
  });

  return {container};
};

describe('MainTextPanel', () => {
  it('shows empty-state copy when no edition is available', async () => {
    const {container} = await renderMainTextPanel({
      edition: null,
      generationProgress: null,
      editionOutOfDate: false
    });

    expect(container.querySelector('.main-text-panel.no-edition')?.textContent).toContain('No main text to show yet');
    expect(container.querySelector('.main-text-content')).toBeNull();
  });

  it('shows out-of-date banner with regenerate button when not regenerating yet', async () => {
    const onClickRegenerate = vi.fn();
    const edition = new Edition().setLang('en').setMainText([makeTextToken('Lorem'), makeParagraphEndToken()]);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: true,
      onClickRegenerate
    });

    expect(container.querySelector('.out-of-date')?.textContent).toContain('Edition is out of date.');
    const regenerateButton = container.querySelector('.out-of-date button');
    expect(regenerateButton?.textContent).toBe('Regenerate');
  });

  it('shows regenerating text instead of regenerate button while generation is in progress', async () => {
    const edition = new Edition().setLang('en').setMainText([makeTextToken('Lorem'), makeParagraphEndToken()]);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: 25,
      editionOutOfDate: true
    });

    expect(container.querySelector('.out-of-date')?.textContent).toContain('Regenerating...');
    expect(container.querySelector('.out-of-date button')).toBeNull();
  });

  it('splits text into paragraphs and applies paragraph_end style to paragraph class', async () => {
    const edition = new Edition().setLang('en').setMainText([
      makeTextToken('First paragraph'),
      makeParagraphEndToken('edition-center'),
      makeTextToken('Second paragraph'),
      makeParagraphEndToken('')
    ]);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false
    });

    const paragraphs = container.querySelectorAll('.main-text-content p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].className).toBe('edition-center');
    expect(paragraphs[0].textContent).toContain('First paragraph');
    expect(paragraphs[1].className).toBe('');
    expect(paragraphs[1].textContent).toContain('Second paragraph');
  });

  it('renders chunk start as marginal note marker with diamond icon and label', async () => {
    const edition = new Edition().setLang('en').setMainText([
      makeChunkStartToken('chunk-12'),
      makeTextToken('Hello'),
      makeGlueToken(' '),
      makeTextToken('world'),
      makeParagraphEndToken()
    ]);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false
    });

    expect(container.querySelector('.main-text-content')?.textContent).toContain('Hello world');
    expect(container.querySelector('.chunk-mark-label')?.textContent).toBe('chunk-12');
    expect(container.querySelector('.chunk-mark-icon')).not.toBeNull();
  });

  it('renders chunk markers for mixed token sequences and ignores chunk_end markers visually', async () => {
    const edition = new Edition().setLang('en').setMainText([
      makeTextToken('Alpha'),
      makeGlueToken(' '),
      makeChunkStartToken('chunk-A'),
      makeTextToken('Beta'),
      makeChunkEndToken('chunk-A'),
      makeGlueToken(' '),
      makeChunkStartToken('chunk-B'),
      makeTextToken('Gamma'),
      makeParagraphEndToken()
    ]);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false
    });

    const labels = Array.from(container.querySelectorAll('.chunk-mark-label')).map((label) => label.textContent);
    expect(labels).toEqual(['chunk-A', 'chunk-B']);
    expect(container.querySelectorAll('.chunk-mark')).toHaveLength(2);
    expect(container.querySelectorAll('.chunk-mark-icon')).toHaveLength(2);
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Alpha');
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Beta');
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Gamma');
  });
});
