/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {createRoot} from 'react-dom/client';
import {act} from 'react';
import {describe, expect, it, vi} from 'vitest';
import SessionPanel from '@/ReactAPM/Pages/MceComposer/SessionsPanel/SessionPanel';
import {StateHistory} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

// Mock ApmFormats
vi.mock('@/pages/common/ApmFormats', () => ({
  ApmFormats: {
    time: vi.fn(() => '12:00:00'),
    timeAgo: vi.fn(() => '1 minute ago'),
  }
}));

// Mock react-bootstrap Button
vi.mock('react-bootstrap', () => ({
  Button: ({children, onClick, variant}: any) => (
    <button type="button" onClick={onClick} className={`btn btn-${variant}`}>
      {children}
    </button>
  )
}));

describe('HistoryPanel', () => {
  const createMockHistory = async (statesCount = 1, currentIndex = 0) => {
    const initialState = {
      actionDescription: 'Initial State',
      signature: 'sig-initial',
      executionTimestamp: Date.now(),
      mceData: {} as any,
      ctDataStatusArray: []
    };
    const history = new StateHistory(initialState);
    
    for (let i = 1; i < statesCount; i++) {
      await history.do({
        execute: async (s: any) => ({...s, signature: `sig-${i}`}),
        description: () => `Action ${i}`
      });
    }

    if (currentIndex < statesCount - 1) {
      history.goToState(currentIndex);
    }
    
    return history;
  };

  it('does not show Clear History button when there is only one state', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const history = await createMockHistory(1);
    const savedSignature = history.getCurrentStateSignature();

    await act(async () => {
      root.render(
        <SessionPanel
          history={history}
          savedStateSignature={savedSignature}
          onGoTo={vi.fn()}
          onClearHistory={vi.fn()}
          historyVersion={0}
        />
      );
    });

    expect(container.textContent).not.toContain('Clear History');
  });

  it('does not show Clear History button when current state is not saved state', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const history = await createMockHistory(2, 1); // 2 states, current is the 2nd one
    const savedSignature = history.getHistory()[0].signature; // saved is the 1st one

    await act(async () => {
      root.render(
        <SessionPanel
          history={history}
          savedStateSignature={savedSignature}
          onGoTo={vi.fn()}
          onClearHistory={vi.fn()}
          historyVersion={0}
        />
      );
    });

    expect(container.textContent).not.toContain('Clear History');
  });

  it('shows Clear History button when current state is saved state and history has multiple states', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const history = await createMockHistory(2, 0); // 2 states, current is the 1st one (saved)
    const savedSignature = history.getCurrentStateSignature();

    await act(async () => {
      root.render(
        <SessionPanel
          history={history}
          savedStateSignature={savedSignature}
          onGoTo={vi.fn()}
          onClearHistory={vi.fn()}
          historyVersion={0}
        />
      );
    });

    // We search for the button more specifically
    const button = container.querySelector('button.btn-primary');
    expect(button).not.toBeNull();
    expect(button?.textContent?.trim()).toBe('Clear History');
  });

  it('calls onClearHistory when button is clicked', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const history = await createMockHistory(2, 0);
    const savedSignature = history.getCurrentStateSignature();
    const onClearHistory = vi.fn();

    await act(async () => {
      root.render(
        <SessionPanel
          history={history}
          savedStateSignature={savedSignature}
          onGoTo={vi.fn()}
          onClearHistory={onClearHistory}
          historyVersion={0}
        />
      );
    });

    const button = container.querySelector('button.btn-primary');
    expect(button).not.toBeNull();
    
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    });

    expect(onClearHistory).toHaveBeenCalledTimes(1);
  });
});
