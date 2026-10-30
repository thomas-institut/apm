/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {CtDataInterface} from '@/CtData/CtDataInterface';
import {Apparatus} from '@/Edition/Apparatus';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {MainTextToken} from '@/Edition/MainTextToken';
import MainTextPanel from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanel';

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
});