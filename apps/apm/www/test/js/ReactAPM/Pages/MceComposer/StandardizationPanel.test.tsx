/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import StandardizationPanel, {StandardizedWord} from '@/ReactAPM/Pages/MceComposer/StandardizationPanel/StandardizationPanel';

vi.mock('react-bootstrap', () => ({
  Button: ({children, ...props}: any) => <button {...props}>{children}</button>,
  Spinner: () => <span>spinner</span>
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', {bubbles: true}));
};

const clickElement = async (element: Element | null) => {
  expect(element).not.toBeNull();
  await act(async () => {
    (element as HTMLElement)?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });
};

const clickDeleteIcon = async (container: HTMLElement) => {
  const icon = container.querySelector('.standardization-controls-buttons .icon-btn');
  await clickElement(icon);
};

const clickResetIcon = async (container: HTMLElement) => {
  const icons = container.querySelectorAll('.standardization-controls-buttons .icon-btn');
  await clickElement(icons.item(1));
};

const clickAddNewIcon = async (container: HTMLElement) => {
  const icon = container.querySelector('.standardization-add-header .icon-btn');
  await clickElement(icon);
};

const renderStandardizationPanel = async (props: {
  standardizedWords?: StandardizedWord[];
  deleteWord?: (original: string) => Promise<true | string>;
  addWord?: (original: string, standardized: string) => Promise<true | string>;
  resetWord?: (original: string) => Promise<true | string>;
}) => {
  document.body.innerHTML = '<div id="root"></div>';
  const container = document.getElementById('root')!;
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <StandardizationPanel
        standardizedWords={props.standardizedWords ?? []}
        delete={props.deleteWord ?? vi.fn().mockResolvedValue(true)}
        add={props.addWord ?? vi.fn().mockResolvedValue(true)}
        reset={props.resetWord ?? vi.fn().mockResolvedValue(true)}
      />
    );
  });

  return {container, root};
};

const makeWord = (): StandardizedWord => ({
  original: 'foo',
  standardized: 'bar',
  numInstances: 11,
  instances: [
    {mainTextIndex: 1, status: 'accepted'},
    {mainTextIndex: 2, status: 'accepted'},
    {mainTextIndex: 3, status: 'accepted'},
    {mainTextIndex: 4, status: 'rejected'},
    {mainTextIndex: 5, status: 'rejected'},
    {mainTextIndex: 6, status: 'rejected'},
    {mainTextIndex: 7, status: 'rejected'},
  ]
});

describe('StandardizationPanel', () => {
  it('renders table columns and row values including accepted/rejected counts', async () => {
    const {container} = await renderStandardizationPanel({
      standardizedWords: [makeWord()]
    });

    expect(container.textContent).toContain('Original');
    expect(container.textContent).toContain('Standard');
    expect(container.textContent).toContain('Num Instances');
    expect(container.textContent).toContain('Accepted');
    expect(container.textContent).toContain('Rejected');
    expect(container.textContent).toContain('Controls');

    const rowText = container.querySelector('tbody tr')?.textContent ?? '';
    expect(rowText).toContain('foo');
    expect(rowText).toContain('bar');
    expect(rowText).toContain('11');
    expect(rowText).toContain('3');
    expect(rowText).toContain('4');
  });

  it('calls delete and reset callbacks and shows row errors from callback result', async () => {
    const deleteWord = vi.fn().mockResolvedValue('cannot delete');
    const resetWord = vi.fn().mockResolvedValue('cannot reset');
    const {container} = await renderStandardizationPanel({
      standardizedWords: [makeWord()],
      deleteWord,
      resetWord,
    });

    await clickDeleteIcon(container);
    expect(deleteWord).toHaveBeenCalledWith('foo');
    expect(container.textContent).toContain('Error: cannot delete');

    await clickResetIcon(container);
    expect(resetWord).toHaveBeenCalledWith('foo');
    expect(container.textContent).toContain('Error: cannot reset');
  });

  it('shows pending spinner while delete is executing', async () => {
    let resolveDelete: (value: true | string) => void = () => {
    };
    const deleteWord = vi.fn().mockImplementation(() => new Promise<true | string>((resolve) => {
      resolveDelete = resolve;
    }));
    const {container} = await renderStandardizationPanel({
      standardizedWords: [makeWord()],
      deleteWord,
    });

    await clickDeleteIcon(container);
    expect(container.textContent).toContain('spinner');

    await act(async () => {
      resolveDelete(true);
    });
  });

  it('validates add form and calls add callback with trimmed values', async () => {
    const addWord = vi.fn().mockResolvedValue(true);
    const {container} = await renderStandardizationPanel({
      standardizedWords: [makeWord()],
      addWord,
    });

    await clickAddNewIcon(container);

    const inputs = Array.from(container.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
    expect(inputs.length).toBe(2);
    const addButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Add') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);

    await act(async () => {
      setInputValue(inputs[0], 'foo');
      setInputValue(inputs[1], 'baz');
    });
    expect(addButton.disabled).toBe(true);

    await act(async () => {
      setInputValue(inputs[0], 'same');
      setInputValue(inputs[1], 'same');
    });
    expect(addButton.disabled).toBe(true);

    await act(async () => {
      setInputValue(inputs[0], '  new-original  ');
      setInputValue(inputs[1], '  new-standard  ');
    });
    expect(addButton.disabled).toBe(false);

    await act(async () => {
      addButton.click();
    });
    expect(addWord).toHaveBeenCalledWith('new-original', 'new-standard');
  });

  it('shows add error when add callback returns an error string', async () => {
    const addWord = vi.fn().mockResolvedValue('cannot add');
    const {container} = await renderStandardizationPanel({
      standardizedWords: [makeWord()],
      addWord,
    });

    await clickAddNewIcon(container);

    const inputs = Array.from(container.querySelectorAll('input[type="text"]')) as HTMLInputElement[];
    const addButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Add') as HTMLButtonElement;

    await act(async () => {
      setInputValue(inputs[0], 'fresh');
      setInputValue(inputs[1], 'normalized');
      addButton.click();
    });

    expect(container.textContent).toContain('Error: cannot add');
  });
});