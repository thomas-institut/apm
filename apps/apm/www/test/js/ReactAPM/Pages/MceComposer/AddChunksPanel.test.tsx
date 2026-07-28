/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import AddChunksPanel from '@/ReactAPM/Pages/MceComposer/AddChunksPanel/AddChunksPanel';

vi.mock('react-bootstrap', () => ({
  Button: ({children, ...props}: any) => <button {...props}>{children}</button>,
  Spinner: (props: any) => <span {...props}>spinner</span>
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles: true}));
};

const getButtonByText = (container: HTMLElement, text: string): HTMLButtonElement | undefined => {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text) as HTMLButtonElement | undefined;
};

describe('AddChunksPanel', () => {
  it('disables Add button when table id is <= 0', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AddChunksPanel currentChunkTableIds={[]} addChunk={vi.fn().mockResolvedValue(true)}
                                 getActiveEditions={vi.fn().mockResolvedValue([])}/>);
    });

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    const addButton = container.querySelector('button') as HTMLButtonElement;

    expect(addButton.disabled).toBe(true);

    await act(async () => {
      setInputValue(input, '0');
    });

    expect(addButton.disabled).toBe(true);
  });

  it('disables Add button when table id already exists', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AddChunksPanel currentChunkTableIds={[7, 9]} addChunk={vi.fn().mockResolvedValue(true)}
                                 getActiveEditions={vi.fn().mockResolvedValue([])}/>);
    });

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    const addButton = container.querySelector('button') as HTMLButtonElement;

    await act(async () => {
      setInputValue(input, '7');
    });

    expect(addButton.disabled).toBe(true);
  });

  it('enables Add button for new positive table id and calls addChunk', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const addChunk = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(<AddChunksPanel currentChunkTableIds={[7, 9]} addChunk={addChunk}
                                 getActiveEditions={vi.fn().mockResolvedValue([])}/>);
    });

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    const addButton = container.querySelector('button') as HTMLButtonElement;

    await act(async () => {
      setInputValue(input, '10');
    });

    const updatedAddButton = container.querySelector('button') as HTMLButtonElement;
    expect(updatedAddButton.disabled).toBe(false);

    await act(async () => {
      updatedAddButton.click();
    });

    expect(addChunk).toHaveBeenCalledWith(10, '');
  });

  it('shows error message when table id is <= 0', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AddChunksPanel currentChunkTableIds={[]} addChunk={vi.fn().mockResolvedValue(true)}
                                 getActiveEditions={vi.fn().mockResolvedValue([])}/>);
    });

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;

    await act(async () => {
      setInputValue(input, '0');
    });

    const errorSpan = container.querySelector('.text-danger');
    expect(errorSpan).not.toBeNull();
    expect(errorSpan?.textContent).toContain('not a valid table Id');
  });

  it('shows error message when table id already exists', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AddChunksPanel currentChunkTableIds={[7, 9]} addChunk={vi.fn().mockResolvedValue(true)}
                                 getActiveEditions={vi.fn().mockResolvedValue([])}/>);
    });

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;

    await act(async () => {
      setInputValue(input, '7');
    });

    const errorSpan = container.querySelector('.text-danger');
    expect(errorSpan).not.toBeNull();
    expect(errorSpan?.textContent).toContain('already in edition');
  });

  it('shows error message when addChunk fails', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const addChunk = vi.fn().mockResolvedValue('Server Error');

    await act(async () => {
      root.render(<AddChunksPanel currentChunkTableIds={[]} addChunk={addChunk}
                                 getActiveEditions={vi.fn().mockResolvedValue([])}/>);
    });

    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    const addButton = container.querySelector('button') as HTMLButtonElement;

    await act(async () => {
      setInputValue(input, '10');
    });

    await act(async () => {
      addButton.click();
    });

    // Wait for the async addChunk call
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const errorSpan = container.querySelector('.text-danger');
    expect(errorSpan).not.toBeNull();
    expect(errorSpan?.textContent).toBe('Error: Server Error');
  });

  it('shows error message when loading editions fails and clears it on successful retry', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const getActiveEditions = vi.fn()
      .mockResolvedValueOnce('Edition service unavailable')
      .mockResolvedValueOnce([
        {
          id: 10,
          title: 'Chunk 10',
          workId: 'W1',
          chunkId: 'C10',
          chunkNumber: 10,
          type: 'manual',
          lastChange: '',
          lastVersion: null,
          witnesses: []
        }
      ]);

    await act(async () => {
      root.render(<AddChunksPanel currentChunkTableIds={[]} addChunk={vi.fn().mockResolvedValue(true)}
                                 getActiveEditions={getActiveEditions}/>);
    });

    const loadDataButton = getButtonByText(container, 'Load Data');
    expect(loadDataButton).not.toBeUndefined();

    await act(async () => {
      loadDataButton?.click();
    });

    const errorDiv = container.querySelector('.editions-table-div .text-danger');
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toBe('Error: Edition service unavailable');

    const retryButton = getButtonByText(container, 'Load Data');
    expect(retryButton).not.toBeUndefined();

    await act(async () => {
      retryButton?.click();
    });

    expect(getActiveEditions).toHaveBeenCalledTimes(2);
    expect(container.querySelector('.editions-table-div .text-danger')).toBeNull();
  });
});
