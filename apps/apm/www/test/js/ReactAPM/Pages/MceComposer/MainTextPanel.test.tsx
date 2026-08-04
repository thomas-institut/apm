/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import MainTextPanel, {
  fullyContainedFirstChunkMarker,
  fullyContainedLastChunkMarker
} from '@/ReactAPM/Pages/MceComposer/MainTextPanel/MainTextPanel';
import {Edition} from '@/Edition/Edition';
import {MainTextToken} from '@/Edition/MainTextToken';

vi.mock('react-bootstrap', () => ({
  Button: ({children, ...props}: any) => <button {...props}>{children}</button>,
  Form: {
    Select: ({children, ...props}: any) => <select {...props}>{children}</select>
  },
  OverlayTrigger: ({children, overlay}: any) => (
    <div className="overlay-trigger-mock">
      {children}
      <div className="overlay-mock">{overlay}</div>
    </div>
  ),
  Popover: ({children, ...props}: any) => <div {...props}>{children}</div>
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

const makeEditionWithChunkParagraphs = (paragraphCount: number): Edition => {
  const mainText: MainTextToken[] = [];
  for (let i = 1; i <= paragraphCount; i++) {
    mainText.push(makeChunkStartToken(`AW47-${i}`));
    mainText.push(makeTextToken(`Paragraph ${i}`));
    mainText.push(makeChunkEndToken(`AW47-${i}`));
    mainText.push(makeParagraphEndToken());
  }

  return new Edition().setLang('en').setMainText(mainText);
};

const makeFullContainedPageLabel = (firstChunkId: string, lastChunkId: string): string =>
  `${fullyContainedFirstChunkMarker}${firstChunkId} → ${lastChunkId}${fullyContainedLastChunkMarker}`;

const renderMainTextPanel = async ({
                                     edition,
                                     standardizedWords = [],
                                     generationProgress,
                                     editionOutOfDate,
                                     onClickRegenerate = vi.fn(),
                                     setInstanceStatus = vi.fn(),
                                     paginationThreshold,
                                     minParsPerPage,
                                     maxParsPerPage
                                   }: {
  edition: Edition | null;
  standardizedWords?: any[];
  generationProgress: number | null;
  editionOutOfDate: boolean;
  onClickRegenerate?: () => void | Promise<void>;
  setInstanceStatus?: (str: string, index: number, status: any) => Promise<true | string>;
  paginationThreshold?: number;
  minParsPerPage?: number;
  maxParsPerPage?: number;
}) => {
  document.body.innerHTML = '<div id="root"></div>';
  const container = document.getElementById('root')!;
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MainTextPanel
        edition={edition}
        standardizedWords={standardizedWords}
        generationProgress={generationProgress}
        editionOutOfDate={editionOutOfDate}
        onClickRegenerate={onClickRegenerate}
        setInstanceStatus={setInstanceStatus}
        paginationThreshold={paginationThreshold}
        minParsPerPage={minParsPerPage}
        maxParsPerPage={maxParsPerPage}
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
      editionOutOfDate: false,
      paginationThreshold: 25,
      minParsPerPage: 10,
      maxParsPerPage: 15
    });

    const paragraphs = container.querySelectorAll('.main-text-content p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].className).toBe('edition-center');
    expect(paragraphs[0].textContent).toContain('First paragraph');
    expect(paragraphs[1].className).toBe('');
    expect(paragraphs[1].textContent).toContain('Second paragraph');
  });

  it('shows page select with chunk-id range labels when page count is low', async () => {
    const edition = makeEditionWithChunkParagraphs(28);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false,
      paginationThreshold: 25,
      minParsPerPage: 10,
      maxParsPerPage: 15
    });

    expect(container.querySelector('.main-text-pagination')).not.toBeNull();
    const select = container.querySelector('.main-text-pagination-select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(container.querySelectorAll('.main-text-pagination-page-button')).toHaveLength(0);
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      makeFullContainedPageLabel('AW47-1', 'AW47-10'),
      makeFullContainedPageLabel('AW47-11', 'AW47-20'),
      makeFullContainedPageLabel('AW47-21', 'AW47-28')
    ]);

    const paragraphs = container.querySelectorAll('.main-text-content p');
    expect(paragraphs).toHaveLength(10);
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Paragraph 1');
    expect(container.querySelector('.main-text-content')?.textContent).not.toContain('Paragraph 11');
  });

  it('marks fully contained first/last chunks with markers in page labels', async () => {
    const edition = new Edition().setLang('en').setMainText([
      makeChunkStartToken('AW47-1'),
      makeTextToken('Paragraph 1'),
      makeParagraphEndToken(),
      makeTextToken('Paragraph 2'),
      makeChunkEndToken('AW47-1'),
      makeChunkStartToken('AW47-2'),
      makeParagraphEndToken(),
      makeTextToken('Paragraph 3'),
      makeChunkEndToken('AW47-2'),
      makeChunkStartToken('AW47-3'),
      makeChunkEndToken('AW47-3'),
      makeParagraphEndToken()
    ]);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false,
      paginationThreshold: 1,
      minParsPerPage: 2,
      maxParsPerPage: 2
    });

    const select = container.querySelector('.main-text-pagination-select') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      `${fullyContainedFirstChunkMarker}AW47-1 → AW47-2`,
      `AW47-2 → AW47-3${fullyContainedLastChunkMarker}`
    ]);
  });

  it('navigates paginated pages with first/previous/next/last controls', async () => {
    const edition = makeEditionWithChunkParagraphs(28);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false,
      paginationThreshold: 25,
      minParsPerPage: 10,
      maxParsPerPage: 15
    });

    await act(async () => {
      (container.querySelector('.main-text-pagination-next') as HTMLButtonElement).click();
    });
    let paragraphTexts = Array.from(container.querySelectorAll('.main-text-content p')).map((paragraph) => paragraph.textContent ?? '');
    expect(paragraphTexts[0]).toContain('Paragraph 11');
    expect(paragraphTexts).not.toContain('Paragraph 1');

    await act(async () => {
      (container.querySelector('.main-text-pagination-last') as HTMLButtonElement).click();
    });
    expect(container.querySelectorAll('.main-text-content p')).toHaveLength(8);
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Paragraph 28');
    expect(container.querySelector('.main-text-content')?.textContent).not.toContain('Paragraph 20');

    await act(async () => {
      (container.querySelector('.main-text-pagination-first') as HTMLButtonElement).click();
    });
    paragraphTexts = Array.from(container.querySelectorAll('.main-text-content p')).map((paragraph) => paragraph.textContent ?? '');
    expect(paragraphTexts[0]).toContain('Paragraph 1');
    expect(paragraphTexts).not.toContain('Paragraph 11');
  });

  it('allows a short last page when previous pages end at chunk boundaries', async () => {
    const edition = makeEditionWithChunkParagraphs(31);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false,
      paginationThreshold: 25,
      minParsPerPage: 10,
      maxParsPerPage: 15
    });

    const select = container.querySelector('.main-text-pagination-select') as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.textContent)).toEqual([
      makeFullContainedPageLabel('AW47-1', 'AW47-10'),
      makeFullContainedPageLabel('AW47-11', 'AW47-20'),
      makeFullContainedPageLabel('AW47-21', 'AW47-30'),
      makeFullContainedPageLabel('AW47-31', 'AW47-31')
    ]);

    await act(async () => {
      (container.querySelector('.main-text-pagination-last') as HTMLButtonElement).click();
    });
    expect(container.querySelectorAll('.main-text-content p')).toHaveLength(1);
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Paragraph 31');
  });

  it('extends pages beyond the minimum when needed to end on a fully contained chunk', async () => {
    const edition = new Edition().setLang('en').setMainText([
      makeChunkStartToken('AW47-1'),
      makeTextToken('Paragraph 1'),
      makeParagraphEndToken(),
      makeTextToken('Paragraph 2'),
      makeChunkEndToken('AW47-1'),
      makeChunkStartToken('AW47-2'),
      makeParagraphEndToken(),
      makeTextToken('Paragraph 3'),
      makeChunkEndToken('AW47-2'),
      makeParagraphEndToken()
    ]);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false,
      paginationThreshold: 1,
      minParsPerPage: 2,
      maxParsPerPage: 4
    });

    const select = container.querySelector('.main-text-pagination-select') as HTMLSelectElement;
    expect(select.options).toHaveLength(1);
    expect(select.options[0].textContent).toBe(makeFullContainedPageLabel('AW47-1', 'AW47-2'));
    expect(container.querySelectorAll('.main-text-content p')).toHaveLength(3);
  });

  it('shows page select for many pages and jumps to selected page', async () => {
    const edition = makeEditionWithChunkParagraphs(60);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false,
      paginationThreshold: 25,
      minParsPerPage: 10,
      maxParsPerPage: 15
    });

    expect(container.querySelectorAll('.main-text-pagination-page-button')).toHaveLength(0);

    const select = container.querySelector('.main-text-pagination-select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(select.options).toHaveLength(6);
    expect(select.options[0].textContent).toBe(makeFullContainedPageLabel('AW47-1', 'AW47-10'));
    expect(select.options[5].textContent).toBe(makeFullContainedPageLabel('AW47-51', 'AW47-60'));

    await act(async () => {
      select.value = '5';
      select.dispatchEvent(new Event('change', {bubbles: true}));
    });

    expect(container.querySelectorAll('.main-text-content p')).toHaveLength(10);
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Paragraph 51');
    expect(container.querySelector('.main-text-content')?.textContent).not.toContain('Paragraph 41');
  });

  it('disables pagination when pagination threshold is lower than 1', async () => {
    const edition = makeEditionWithChunkParagraphs(60);

    const {container} = await renderMainTextPanel({
      edition,
      generationProgress: null,
      editionOutOfDate: false,
      paginationThreshold: 0,
      minParsPerPage: 10,
      maxParsPerPage: 15
    });

    expect(container.querySelector('.main-text-pagination')).toBeNull();
    expect(container.querySelectorAll('.main-text-content p')).toHaveLength(60);
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Paragraph 1');
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Paragraph 60');
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

  it('renders chunk markers for mixed token sequences', async () => {
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
    expect(container.querySelectorAll('.chunk-mark-icon.chunk-start')).toHaveLength(2);
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Alpha');
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Beta');
    expect(container.querySelector('.main-text-content')?.textContent).toContain('Gamma');
  });

  it('wraps standardized words in span with appropriate status class', async () => {
    const edition = new Edition().setLang('en').setMainText([
      makeTextToken('First'),
      makeGlueToken(' '),
      makeTextToken('Second'),
      makeGlueToken(' '),
      makeTextToken('Third'),
      makeParagraphEndToken()
    ]);

    const standardizedWords = [
      {
        original: 'First',
        standardized: '1st',
        instances: [{mainTextIndex: 0, status: 'accepted'}]
      },
      {
        original: 'Second',
        standardized: '2nd',
        instances: [{mainTextIndex: 2, status: 'rejected'}]
      },
      {
        original: 'Third',
        standardized: '3rd',
        instances: [{mainTextIndex: 4, status: 'notReviewed'}]
      }
    ];

    const {container} = await renderMainTextPanel({
      edition,
      standardizedWords,
      generationProgress: null,
      editionOutOfDate: false
    });

    const acceptedSpan = container.querySelector('.standardized-word.accepted');
    expect(acceptedSpan?.textContent).toBe('First');

    const rejectedSpan = container.querySelector('.standardized-word.rejected');
    expect(rejectedSpan?.textContent).toBe('Second');

    const notReviewedSpan = container.querySelector('.standardized-word.not-reviewed');
    expect(notReviewedSpan?.textContent).toBe('Third');
  });

  it('triggers setInstanceStatus when clicking buttons in the popover', async () => {
    const edition = new Edition().setLang('en').setMainText([
      makeTextToken('Word'),
      makeParagraphEndToken()
    ]);

    const standardizedWords = [
      {
        original: 'Word',
        standardized: 'Wrd',
        instances: [{mainTextIndex: 0, status: 'notReviewed'}]
      }
    ];

    const setInstanceStatus = vi.fn().mockResolvedValue(true);

    const {container} = await renderMainTextPanel({
      edition,
      standardizedWords,
      generationProgress: null,
      editionOutOfDate: false,
      setInstanceStatus
    });

    const acceptButton = container.querySelector('button[title="Accept"]') as HTMLButtonElement;
    expect(acceptButton).not.toBeNull();

    await act(async () => {
      acceptButton.click();
    });

    expect(setInstanceStatus).toHaveBeenCalledWith('Wrd', 0, 'accepted');

    const rejectButton = container.querySelector('button[title="Reject"]') as HTMLButtonElement;
    await act(async () => {
      rejectButton.click();
    });
    expect(setInstanceStatus).toHaveBeenCalledWith('Wrd', 0, 'rejected');

    const resetButton = container.querySelector('button[title="Reset"]') as HTMLButtonElement;
    expect(resetButton).not.toBeNull();
    await act(async () => {
      resetButton.click();
    });
    expect(setInstanceStatus).toHaveBeenCalledWith('Wrd', 0, 'notReviewed');
  });

  it('does not display popover when edition is out of date', async () => {
    const edition = new Edition().setLang('en').setMainText([
      makeTextToken('Word'),
      makeParagraphEndToken()
    ]);

    const standardizedWords = [
      {
        original: 'Word',
        standardized: 'Wrd',
        instances: [{mainTextIndex: 0, status: 'notReviewed'}]
      }
    ];

    const {container} = await renderMainTextPanel({
      edition,
      standardizedWords,
      generationProgress: null,
      editionOutOfDate: true
    });

    const overlayTrigger = container.querySelector('.overlay-trigger-mock');
    expect(overlayTrigger).toBeNull();

    const standardizedWord = container.querySelector('.standardized-word.disabled');
    expect(standardizedWord).not.toBeNull();
    expect(standardizedWord?.textContent).toBe('Word');
    expect(standardizedWord?.getAttribute('title')).toBe('Edition out of date');
  });
});
