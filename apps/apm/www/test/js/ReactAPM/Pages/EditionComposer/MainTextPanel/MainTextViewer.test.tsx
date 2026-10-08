/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
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
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const originalIndexClass = Array.from(this.classList).find(className => className.startsWith('mtt-'));
      const index = originalIndexClass === undefined ? -1 : Number.parseInt(originalIndexClass.slice(4), 10);
      return {top: lineTops[index] ?? 0} as DOMRect;
    });

    const render = async (indexMap: Record<number, number>) => {
      await act(async () => {
        root.render(
          <MainTextViewer mainText={mainText} indexMap={indexMap} onLineNumberingChange={onLineNumberingChange}/>
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
});