/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import MainTextEditorToolbar from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextEditorToolbar';
import {EditionMainTextEditorFormatState} from '@/EditionComposer/EditionMainTextEditor';
import {toolbarCharactersDefinition} from '@/EditionComposer/ToolbarCharactersDefinition';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const emptyFormatState: EditionMainTextEditorFormatState = {
  bold: false, italic: false, numberingLabel: false, small: false, superscript: false, heading: null
};

describe('MainTextEditorToolbar', () => {
  it('renders format, heading, and character buttons for Latin and Hebrew', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    for (const [lang, characterButton] of [['la', '.leftDQM-btn'], ['he', '.maqaf-btn']] as const) {
      await act(async () => root.render(<MainTextEditorToolbar lang={lang} formatState={emptyFormatState}
        onToggleFormat={vi.fn()} onToggleHeading={vi.fn()} onInsertCharacter={vi.fn()}/>));

      expect(container.querySelector('.fte-toolbar')?.classList.contains(`text-${lang}`)).toBe(true);
      expect(container.querySelector<HTMLButtonElement>('.bold-btn')?.title).toBe('Bold');
      expect(container.querySelector<HTMLButtonElement>('.heading1-btn')?.title).toBe('Heading 1');
      expect(container.querySelector(characterButton)).not.toBeNull();
    }

    await act(async () => root.unmount());
    container.remove();
  });

  it('reflects active format and heading state', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const formatState = {...emptyFormatState, bold: true, heading: 2};

    await act(async () => root.render(<MainTextEditorToolbar lang="la" formatState={formatState}
      onToggleFormat={vi.fn()} onToggleHeading={vi.fn()} onInsertCharacter={vi.fn()}/>));

    expect(container.querySelector('.bold-btn')?.classList.contains('on')).toBe(true);
    expect(container.querySelector('.heading2-btn')?.classList.contains('on')).toBe(true);
    expect(container.querySelector('.heading1-btn')?.classList.contains('on')).toBe(false);

    await act(async () => root.unmount());
    container.remove();
  });

  it('dispatches toolbar actions without stealing the editor selection', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onToggleFormat = vi.fn();
    const onToggleHeading = vi.fn();
    const onInsertCharacter = vi.fn();

    await act(async () => root.render(<MainTextEditorToolbar lang="la" formatState={emptyFormatState}
      onToggleFormat={onToggleFormat} onToggleHeading={onToggleHeading} onInsertCharacter={onInsertCharacter}/>));

    const boldButton = container.querySelector<HTMLButtonElement>('.bold-btn')!;
    const mouseDown = new MouseEvent('mousedown', {bubbles: true, cancelable: true});
    await act(async () => boldButton.dispatchEvent(mouseDown));
    expect(mouseDown.defaultPrevented).toBe(true);

    await act(async () => container.querySelector<HTMLButtonElement>('.italic-btn')!.click());
    await act(async () => container.querySelector<HTMLButtonElement>('.heading3-btn')!.click());
    await act(async () => container.querySelector<HTMLButtonElement>('.emDash-btn')!.click());

    expect(onToggleFormat).toHaveBeenCalledWith('italic');
    expect(onToggleHeading).toHaveBeenCalledWith(3);
    expect(onInsertCharacter).toHaveBeenCalledWith('emDash');

    await act(async () => root.unmount());
    container.remove();
  });

  it('uses the RTL label variant when one is defined', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const characterDefinition = toolbarCharactersDefinition.he.rightDQM;
    characterDefinition.rtlVersion = 'RTL';

    await act(async () => root.render(<MainTextEditorToolbar lang="he" formatState={emptyFormatState}
      onToggleFormat={vi.fn()} onToggleHeading={vi.fn()} onInsertCharacter={vi.fn()}/>));

    expect(container.querySelector('.rightDQM-btn')?.textContent).toBe('RTL');

    delete characterDefinition.rtlVersion;
    await act(async () => root.unmount());
    container.remove();
  });
});