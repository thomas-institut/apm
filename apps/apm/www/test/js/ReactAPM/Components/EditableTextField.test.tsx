/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from 'vitest';
import EditableTextField from '@/ReactAPM/Components/EditableTextField';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('EditableTextField', () => {
  it('should be defined', () => {
    expect(EditableTextField).toBeDefined();
  });

  it('renders with initial text', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    
    await act(async () => {
      root.render(<EditableTextField text="Hello World" onConfirm={() => {}} />);
    });

    const textSpan = container.querySelector('.theText');
    expect(textSpan).not.toBeNull();
    expect(textSpan?.textContent).toBe('Hello World');
    
    // Should be in normal mode initially
    expect(container.querySelector('.etf-normal')).not.toBeNull();
  });

  it('enters edit mode on click', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    
    await act(async () => {
      root.render(<EditableTextField text="Edit Me" onConfirm={() => {}} />);
    });

    const mainDiv = container.querySelector('.etf-normal') as HTMLElement;
    
    await act(async () => {
      mainDiv.click();
    });

    // Should now be in editing mode
    expect(container.querySelector('.etf-editing')).not.toBeNull();
    const input = container.querySelector('input.textInput') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.value).toBe('Edit Me');
    
    // Should show confirm and cancel buttons
    expect(container.querySelector('.confirmButton')).not.toBeNull();
    expect(container.querySelector('.cancelButton')).not.toBeNull();
  });

  it('calls onConfirm with new text and returns to normal mode', async () => {
    const onConfirm = vi.fn();
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    
    await act(async () => {
      root.render(<EditableTextField text="Initial" onConfirm={onConfirm} />);
    });

    // Enter edit mode
    await act(async () => {
      (container.querySelector('.etf-normal') as HTMLElement).click();
    });

    const input = container.querySelector('input.textInput') as HTMLInputElement;
    
    // Change text
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'New Text');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Click confirm
    const confirmBtn = container.querySelector('.confirmButton') as HTMLElement;
    await act(async () => {
      confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onConfirm).toHaveBeenCalledWith('New Text');
    // Should be back in normal mode (though showing old text because prop didn't change yet)
    expect(container.querySelector('.etf-normal')).not.toBeNull();
  });

  it('shows edit button on hover', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    
    await act(async () => {
      root.render(<EditableTextField text="Hover Me" onConfirm={() => {}} />);
    });

    const mainDiv = container.querySelector('.etf-normal') as HTMLElement;
    
    await act(async () => {
      mainDiv.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    expect(container.querySelector('.editButton')).not.toBeNull();
    expect(container.querySelector('.etf-hover')).not.toBeNull();

    await act(async () => {
      mainDiv.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });

    expect(container.querySelector('.editButton')).toBeNull();
    expect(container.querySelector('.etf-normal')).not.toBeNull();
  });

  it('reverts to normal mode on cancel', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    
    await act(async () => {
      root.render(<EditableTextField text="Initial" onConfirm={() => {}} />);
    });

    await act(async () => {
      (container.querySelector('.etf-normal') as HTMLElement).click();
    });

    const cancelBtn = container.querySelector('.cancelButton') as HTMLElement;
    await act(async () => {
      cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('.etf-normal')).not.toBeNull();
    expect(container.querySelector('.theText')?.textContent).toBe('Initial');
  });

  it('confirms on Enter key', async () => {
    const onConfirm = vi.fn();
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    
    await act(async () => {
      root.render(<EditableTextField text="Initial" onConfirm={onConfirm} />);
    });

    await act(async () => {
      (container.querySelector('.etf-normal') as HTMLElement).click();
    });

    const input = container.querySelector('input.textInput') as HTMLInputElement;
    
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onConfirm).toHaveBeenCalled();
    expect(container.querySelector('.etf-normal')).not.toBeNull();
  });

  it('cancels on Escape key', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    
    await act(async () => {
      root.render(<EditableTextField text="Initial" onConfirm={() => {}} />);
    });

    await act(async () => {
      (container.querySelector('.etf-normal') as HTMLElement).click();
    });

    const input = container.querySelector('input.textInput') as HTMLInputElement;
    
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(container.querySelector('.etf-normal')).not.toBeNull();
  });

  it('uses editingClassName in edit mode', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<EditableTextField text="Edit Me" className="normalClass" editingClassName="editingClass" onConfirm={() => {}} />);
    });

    const mainDiv = container.querySelector('.etf-normal') as HTMLElement;
    expect(mainDiv.classList.contains('normalClass')).toBe(true);

    await act(async () => {
      mainDiv.click();
    });

    const editingDiv = container.querySelector('.etf-editing') as HTMLElement;
    expect(editingDiv.classList.contains('editingClass')).toBe(true);
    expect(editingDiv.classList.contains('normalClass')).toBe(false);
  });

  it('defaults editingClassName to className in edit mode', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    await act(async () => {
      root.render(<EditableTextField text="Edit Me" className="normalClass" onConfirm={() => {}} />);
    });

    const mainDiv = container.querySelector('.etf-normal') as HTMLElement;
    expect(mainDiv.classList.contains('normalClass')).toBe(true);

    await act(async () => {
      mainDiv.click();
    });

    const editingDiv = container.querySelector('.etf-editing') as HTMLElement;
    expect(editingDiv.classList.contains('normalClass')).toBe(true);
  });
});
