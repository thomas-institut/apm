/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ComponentWithPending from '@/ReactAPM/Components/ComponentWithPending';

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

describe('ComponentWithPending', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get() {
        if (!(this instanceof HTMLElement)) {
          return 0;
        }
        if (this.textContent?.includes('pending-small')) {
          return 20;
        }
        if (this.textContent?.includes('loaded-large-content')) {
          return 240;
        }
        return 0;
      }
    });

    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get() {
        if (!(this instanceof HTMLElement)) {
          return 0;
        }
        if (this.textContent?.includes('pending-small')) {
          return 12;
        }
        if (this.textContent?.includes('loaded-large-content')) {
          return 84;
        }
        return 0;
      }
    });
  });

  afterEach(() => {
    if (originalOffsetWidth !== undefined) {
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
    }
    if (originalOffsetHeight !== undefined) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    }
  });

  it('updates smart-container dimensions after pending switches to loaded content', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const renderComponent = (pending: boolean) => {
      root.render(
        <ComponentWithPending
          pending={pending}
          smartContainer={true}
          pendingElement={<span>pending-small</span>}
        >
          <span>loaded-large-content</span>
        </ComponentWithPending>
      );
    };

    await act(async () => {
      renderComponent(true);
    });

    let wrapper = container.firstElementChild as HTMLSpanElement;
    expect(wrapper.style.width).toBe('');
    expect(wrapper.style.height).toBe('');

    await act(async () => {
      renderComponent(false);
    });

    await act(async () => {
      renderComponent(true);
    });

    wrapper = container.firstElementChild as HTMLSpanElement;
    expect(wrapper.style.width).toBe('240px');
    expect(wrapper.style.height).toBe('84px');
  });
});
