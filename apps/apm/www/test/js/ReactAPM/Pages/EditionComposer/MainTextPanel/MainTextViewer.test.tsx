/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import {Apparatus} from '@/Edition/Apparatus';
import {ApparatusEntry} from '@/Edition/ApparatusEntry';
import {MainTextToken} from '@/Edition/MainTextToken';
import MainTextViewer, {MainTextIndexToLineMap} from '@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MainTextViewer', () => {
  it('reports one-based line numbers and only notifies when they change', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const mainText = Array.from({length: 11}, (_, index) => new MainTextToken().setText(`Token ${index}`, index));
    const onLineNumberingChange = vi.fn<(lineNumbering: MainTextIndexToLineMap) => void>();
    let lineTops = [10, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const originalIndexClass = this.className.split(/\s+/).find(className => className.startsWith('mtt-'));
      const index = originalIndexClass === undefined ? -1 : Number.parseInt(originalIndexClass.slice(4), 10);
      return {top: lineTops[index] ?? 0} as DOMRect;
    });

    const render = async (indexMap: Record<number, number>) => {
      await act(async () => {
        root.render(
          <MainTextViewer mainText={mainText} indexMap={indexMap} highlightedTokenRange={{from: 2, to: 4}}
                          selectedTokenRange={{from: 4, to: 5}}
                          onLineNumberingChange={onLineNumberingChange}/>
        );
      });
    };

    await render({});
    expect(onLineNumberingChange).toHaveBeenCalledTimes(1);
    expect(onLineNumberingChange).toHaveBeenLastCalledWith(new Map([
      [0, 1], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9], [10, 10]
    ]));
    const lineNumberSpans = Array.from(container.querySelectorAll('.main-text-line-number'));
    expect(lineNumberSpans.map(span => span.textContent)).toEqual(['1', '5', '10']);
    expect(lineNumberSpans.map(span => (span as HTMLElement).style.top)).toEqual(['10px', '50px', '100px']);
    const highlightedTokens = Array.from(container.querySelectorAll('.highlighted-token'));
    expect(highlightedTokens.map(span => Array.from(span.classList).find(className => className.startsWith('mtt-')))).toEqual([
      'mtt-2', 'mtt-3', 'mtt-4'
    ]);
    const selectedTokens = Array.from(container.querySelectorAll('.selected-token'));
    expect(selectedTokens.map(span => Array.from(span.classList).find(className => className.startsWith('mtt-')))).toEqual([
      'mtt-4', 'mtt-5'
    ]);

    await render({0: 0});
    expect(onLineNumberingChange).toHaveBeenCalledTimes(1);

    lineTops = mainText.map((_, index) => (index + 1) * 10);
    await render({0: 0, 1: 1});
    expect(onLineNumberingChange).toHaveBeenCalledTimes(2);
    expect(onLineNumberingChange).toHaveBeenLastCalledWith(new Map(mainText.map((_, index) => [index, index + 1])));

    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('selects backwards across whitespace and reports overlapping apparatus coverage', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const first = new Apparatus();
    first.type = 'critical';
    const firstEntry = new ApparatusEntry();
    firstEntry.from = 0;
    firstEntry.to = 2;
    firstEntry.mainTextWords = ['one', 'two'];
    first.entries.push(firstEntry);
    const second = new Apparatus();
    second.type = 'marginal';
    const secondEntry = new ApparatusEntry();
    secondEntry.from = 0;
    secondEntry.to = 0;
    secondEntry.mainTextWords = ['one'];
    second.entries.push(secondEntry);
    const glue = new MainTextToken();
    glue.type = 'glue';
    const mainText = [new MainTextToken().setText('one', 0), glue, new MainTextToken().setText('two', 1)];
    const onSelectionChange = vi.fn();
    const onHoverApparatusEntries = vi.fn();

    await act(async () => root.render(<MainTextViewer mainText={mainText} indexMap={{0: 0, 1: 1}}
                                                     mode="apparatus" canSelectTokens apparatuses={[first, second]}
                                                     activeApparatusIndex={0}
                                                     className="main-text-viewer"
                                                     onSelectionChange={onSelectionChange}
                                                     onHoverApparatusEntries={onHoverApparatusEntries}/>));

    const firstToken = container.querySelector<HTMLElement>('.mtt-0')!;
    const whitespace = container.querySelector<HTMLElement>('.mtt-1')!;
    const lastToken = container.querySelector<HTMLElement>('.mtt-2')!;
    await act(async () => {
      lastToken.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
      firstToken.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith({from: 2, to: 0});
    expect(container.querySelectorAll('.selected-token')).toHaveLength(3);
    expect(container.querySelectorAll('.apparatus-coverage-highlighted')).toHaveLength(3);

    await act(async () => {
      container.querySelector('.main-text-viewer')!.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
      firstToken.dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
      firstToken.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
    });
    expect(onHoverApparatusEntries).toHaveBeenLastCalledWith([
      {apparatusIndex: 0, entryIndex: 0}, {apparatusIndex: 1, entryIndex: 0}
    ]);

    await act(async () => {
      whitespace.dispatchEvent(new MouseEvent('mousedown', {bubbles: true, cancelable: true}));
    });
    expect(container.querySelectorAll('.selected-token')).toHaveLength(0);
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);

    await act(async () => root.unmount());
    container.remove();
  });

  it('highlights all, no, active, or explicitly selected apparatus entries', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const first = new Apparatus();
    first.type = 'critical';
    const firstEntry = new ApparatusEntry();
    firstEntry.from = 0;
    firstEntry.to = 0;
    first.entries.push(firstEntry);
    const second = new Apparatus();
    second.type = 'fontium';
    const secondEntry = new ApparatusEntry();
    secondEntry.from = 2;
    secondEntry.to = 2;
    second.entries.push(secondEntry);
    const glue = new MainTextToken();
    glue.type = 'glue';
    const mainText = [new MainTextToken().setText('first', 0), glue, new MainTextToken().setText('second', 1)];
    const apparatuses = [first, second];
    const highlightedTokenClasses = () => Array.from(container.querySelectorAll('.apparatus-coverage-highlighted'))
      .map(element => Array.from(element.classList).find(className => className.startsWith('mtt-')));

    const render = async (apparatusHighlightSelection: 'all' | 'none' | 'active' | number,
                         activeApparatusIndex: number | null = 0) => {
      await act(async () => root.render(<MainTextViewer mainText={mainText} indexMap={{0: 0, 1: 1}}
                                                       apparatuses={apparatuses}
                                                       activeApparatusIndex={activeApparatusIndex}
                                                       apparatusHighlightSelection={apparatusHighlightSelection}/>));
    };

    await render('active', 0);
    expect(highlightedTokenClasses()).toEqual(['mtt-0']);

    await render('active', 1);
    expect(highlightedTokenClasses()).toEqual(['mtt-2']);

    await render(0, 1);
    expect(highlightedTokenClasses()).toEqual(['mtt-0']);

    await render('all');
    expect(highlightedTokenClasses()).toEqual(['mtt-0', 'mtt-2']);

    await render('none');
    expect(container.querySelectorAll('.apparatus-coverage-highlighted')).toHaveLength(0);

    await act(async () => root.unmount());
    container.remove();
  });
});