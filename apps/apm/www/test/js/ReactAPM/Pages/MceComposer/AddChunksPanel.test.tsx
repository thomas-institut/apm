/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import AddChunksPanel from '@/ReactAPM/Pages/MceComposer/AddChunksPanel';

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

describe('AddChunksPanel', () => {
  it('disables Add button when table id is <= 0', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<AddChunksPanel currentChunkTableIds={[]} addChunk={vi.fn().mockResolvedValue(true)}/>);
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
      root.render(<AddChunksPanel currentChunkTableIds={[7, 9]} addChunk={vi.fn().mockResolvedValue(true)}/>);
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
      root.render(<AddChunksPanel currentChunkTableIds={[7, 9]} addChunk={addChunk}/>);
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
});
