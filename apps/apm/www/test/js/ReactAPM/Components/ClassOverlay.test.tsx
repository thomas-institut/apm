/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createRoot, Root} from 'react-dom/client';
import ClassOverlay from '@/ReactAPM/Components/ClassOverlay/ClassOverlay';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  root?.unmount();
  root = undefined;
  document.body.innerHTML = '';
});

async function renderOverlay(
  children: React.ReactNode,
  getOverlayContent: (id: string | null) => React.ReactNode,
  props: Partial<React.ComponentProps<typeof ClassOverlay>> = {}
) {
  document.body.innerHTML = '<div id="root"></div>';
  const container = document.getElementById('root')!;
  root = createRoot(container);

  await act(async () => {
    root!.render(
      <ClassOverlay
        baseClassName="overlay-ref"
        idClassPrefix="overlay-id-"
        getOverlayContent={getOverlayContent}
        {...props}
      >
        {children}
      </ClassOverlay>
    );
  });

  return container;
}

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });
}

async function mouseEvent(element: Element, type: 'mouseover' | 'mouseout') {
  await act(async () => {
    element.dispatchEvent(new MouseEvent(type, {bubbles: true}));
  });
}

describe('ClassOverlay', () => {
  it('shows positioned content for a reference and passes its id to the content function', async () => {
    const getOverlayContent = vi.fn((id: string | null) => <span>content-{id}</span>);
    const container = await renderOverlay(
      <button className="overlay-ref overlay-id-first">Reference</button>,
      getOverlayContent
    );

    await click(container.querySelector('.overlay-ref')!);

    const overlay = container.querySelector('.overlay-content') as HTMLDivElement;
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toBe('content-first');
    expect(getOverlayContent).toHaveBeenLastCalledWith('first');
    expect(overlay.style.position).toBe('absolute');
  });

  it('toggles the overlay when the same reference is clicked again', async () => {
    const container = await renderOverlay(
      <button className="overlay-ref overlay-id-first">Reference</button>,
      id => <span>content-{id}</span>
    );
    const reference = container.querySelector('.overlay-ref')!;

    await click(reference);
    expect(container.querySelector('.overlay-content')).not.toBeNull();

    await click(reference);
    expect(container.querySelector('.overlay-content')).toBeNull();
  });

  it('shows the new content when a different reference is clicked', async () => {
    const container = await renderOverlay(
      <>
        <button className="overlay-ref overlay-id-first">First</button>
        <button className="overlay-ref overlay-id-second">Second</button>
      </>,
      id => <span>content-{id}</span>
    );

    await click(container.querySelector('.overlay-id-first')!);
    await click(container.querySelector('.overlay-id-second')!);

    expect(container.querySelector('.overlay-content')?.textContent).toBe('content-second');
  });

  it('hides the overlay when a non-reference child is clicked', async () => {
    const container = await renderOverlay(
      <>
        <button className="overlay-ref overlay-id-first">Reference</button>
        <span className="ordinary-child">Ordinary child</span>
      </>,
      id => <span>content-{id}</span>
    );

    await click(container.querySelector('.overlay-ref')!);
    expect(container.querySelector('.overlay-content')).not.toBeNull();

    await click(container.querySelector('.ordinary-child')!);
    expect(container.querySelector('.overlay-content')).toBeNull();
  });

  it('shows content after hovering over a reference for the configured delay', async () => {
    vi.useFakeTimers();
    const container = await renderOverlay(
      <button className="overlay-ref overlay-id-first">Reference</button>,
      id => <span>content-{id}</span>,
      {trigger: 'hover', hoverDelay: 100}
    );

    await mouseEvent(container.querySelector('.overlay-ref')!, 'mouseover');
    expect(container.querySelector('.overlay-content')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(container.querySelector('.overlay-content')?.textContent).toBe('content-first');
    vi.useRealTimers();
  });

  it('does not show content when the pointer leaves before the hover delay', async () => {
    vi.useFakeTimers();
    const container = await renderOverlay(
      <button className="overlay-ref overlay-id-first">Reference</button>,
      id => <span>content-{id}</span>,
      {trigger: 'hover', hoverDelay: 100}
    );
    const reference = container.querySelector('.overlay-ref')!;

    await mouseEvent(reference, 'mouseover');
    await mouseEvent(reference, 'mouseout');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(container.querySelector('.overlay-content')).toBeNull();
    vi.useRealTimers();
  });

  it('hides content immediately when the pointer leaves a hovered reference', async () => {
    vi.useFakeTimers();
    const container = await renderOverlay(
      <button className="overlay-ref overlay-id-first">Reference</button>,
      id => <span>content-{id}</span>,
      {trigger: 'hover', hoverDelay: 0}
    );
    const reference = container.querySelector('.overlay-ref')!;

    await mouseEvent(reference, 'mouseover');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(container.querySelector('.overlay-content')).not.toBeNull();

    await mouseEvent(reference, 'mouseout');
    expect(container.querySelector('.overlay-content')).toBeNull();
    vi.useRealTimers();
  });
});