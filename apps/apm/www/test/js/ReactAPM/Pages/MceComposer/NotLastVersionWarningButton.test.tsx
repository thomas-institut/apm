/**
 * @vitest-environment happy-dom
 */

import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vitest';
import NotLastVersionWarningButton from '@/ReactAPM/Pages/MceComposer/NotLastVersionWarningButton';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('NotLastVersionWarningButton', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('updates the time ago message each time the popover is displayed', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T12:00:00Z'));

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<NotLastVersionWarningButton version={'2023-01-01 11:59:30'}/>);
    });

    const warningButton = container.querySelector('.icon-btn') as HTMLElement;
    await act(async () => {
      warningButton.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
    });
    expect(document.querySelector('.not-last-version-popover')?.textContent).toContain('<1min ago');

    await act(async () => {
      warningButton.dispatchEvent(new MouseEvent('mouseout', {bubbles: true}));
    });
    await act(async () => {
      vi.advanceTimersByTime(16_000);
    });
    await act(async () => {
      warningButton.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
    });
    expect(document.querySelector('.not-last-version-popover')?.textContent).toContain('1 min ago');

    root.unmount();
  });
});