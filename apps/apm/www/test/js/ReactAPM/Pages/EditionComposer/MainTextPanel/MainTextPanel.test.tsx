/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import type {FmtText} from '@thomas-inst/fmt-text';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {Apparatus} from '@/Edition/Apparatus';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {MainTextToken} from '@/Edition/MainTextToken';
import * as WitnessTokenType from '@/Witness/WitnessTokenType';
import MainTextPanel from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanel';

vi.mock('@/ReactAPM/Pages/EditionComposer/MainTextPanel/EditionMainTextEditorWrapper', async () => {
  const React = await import('react');
  const {fromString, getPlainText} = await import('@thomas-inst/fmt-text');
  return {
    default: ({initialText, onChange}: {initialText: FmtText, onChange: (text: FmtText) => void}) => {
      const [text, setText] = React.useState(getPlainText(initialText));
      return React.createElement(React.Fragment, null,
        React.createElement('textarea', {
          className: 'mock-edition-main-text-editor', value: text,
          onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setText(event.currentTarget.value);
            onChange(fromString(event.currentTarget.value));
          }
        }),
        React.createElement('button', {
          className: 'mock-change-text', type: 'button',
          onClick: () => {
            setText('changed');
            onChange(fromString('changed'));
          }
        }, 'Edit text')
      );
    }
  };
});

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MainTextPanel', () => {
  it('shows apparatus coverage highlights in apparatus mode but not text mode', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const token = new MainTextToken().setText('word', 0);
    token.originalIndex = 0;
    const entry = new ApparatusEntry();
    entry.from = 0;
    entry.to = 0;
    entry.mainTextWords = ['word'];
    const apparatus = new Apparatus();
    apparatus.entries.push(entry);
    const onHoverApparatusEntries = vi.fn();

    await act(async () => root.render(<MainTextPanel mainText={[token]}
                                                     ctData={{type: 'ctable', lang: 'la'} as CtDataInterface}
                                                     apparatuses={[apparatus]} activeApparatusIndex={0}
                                                     sigla={[]} canEdit highlightedTokenRange={{from: 0, to: 0}}
                                                     onHoverApparatusEntries={onHoverApparatusEntries}/>));

    expect(container.querySelector('.main-text-view-controls')).not.toBeNull();
    expect(container.querySelectorAll('.highlighted-token')).toHaveLength(1);
    expect(container.querySelectorAll('.apparatus-coverage-highlighted')).toHaveLength(1);

    for (const [mode, expectedApparatusHighlights] of [['Apparatus', 1], ['Text', 0]] as const) {
      const modeButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => button.textContent === mode)!;
      await act(async () => modeButton.click());

      expect(container.querySelector('.main-text-view-controls')).toBeNull();
      expect(container.querySelectorAll('.highlighted-token')).toHaveLength(0);
      expect(container.querySelectorAll('.apparatus-coverage-highlighted')).toHaveLength(expectedApparatusHighlights);

      onHoverApparatusEntries.mockClear();
      await act(async () => container.querySelector<HTMLElement>('.mtt-0')!
        .dispatchEvent(new MouseEvent('mouseover', {bubbles: true})));
      expect(onHoverApparatusEntries).not.toHaveBeenCalled();
      expect(container.querySelector('.main-text-apparatus-popover')).toBeNull();
    }

    await act(async () => root.unmount());
    container.remove();
  });

  it('previews, reverts, and commits text-mode changes', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const mainText = new MainTextToken().setText('word', 0);
    const baseToken = {tokenClass: 'edition', tokenType: WitnessTokenType.WORD, text: 'word'};
    const ctData = {
      type: 'edition', lang: 'la', editionWitnessIndex: 0,
      witnesses: [{witnessType: 'edition', tokens: [baseToken]}],
      collationMatrix: [[0]], groupedColumns: [], customApparatuses: [],
      automaticNormalizationsApplied: [], witnessOrder: [0], sigla: ['E'], siglaGroups: []
    } as unknown as CtDataInterface;
    const onCommitTextEdit = vi.fn(async () => true);

    await act(async () => root.render(<MainTextPanel mainText={[mainText]} ctData={ctData}
      apparatuses={[]} activeApparatusIndex={null} sigla={['E']} canEdit highlightedTokenRange={null}
      onCommitTextEdit={onCommitTextEdit} editionWitnessTokenNormalizer={token => token}/>));
    const textModeButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent === 'Text')!;
    await act(async () => textModeButton.click());

    await act(async () => container.querySelector<HTMLButtonElement>('.mock-change-text')!.click());
    await act(async () => new Promise(resolve => setTimeout(resolve, 650)));
    expect(container.textContent).toContain('There is 1 change');

    await act(async () => Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent === 'Revert')!.click());
    expect(container.querySelector<HTMLTextAreaElement>('.mock-edition-main-text-editor')!.value).toBe('word');
    expect(container.querySelector('.main-text-edit-changes-info')).toBeNull();

    await act(async () => container.querySelector<HTMLButtonElement>('.mock-change-text')!.click());
    await act(async () => new Promise(resolve => setTimeout(resolve, 650)));
    await act(async () => Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
      .find(button => button.textContent === 'Commit')!.click());

    expect(onCommitTextEdit).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.mock-edition-main-text-editor')).toBeNull();
    expect(container.querySelector('.main-text-viewer')).not.toBeNull();

    await act(async () => root.unmount());
    container.remove();
  });
});