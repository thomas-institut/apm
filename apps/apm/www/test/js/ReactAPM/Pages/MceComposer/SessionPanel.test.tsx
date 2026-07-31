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

vi.mock('react-bootstrap-icons', () => ({
  CheckCircleFill: ({className}: {className?: string}) => <span data-icon="current" className={className}>current</span>,
  Circle: ({className}: {className?: string}) => <span data-icon="not-current" className={className}>not-current</span>,
  Save: ({className, title}: {className?: string; title?: string}) => <span data-icon="saved" className={className}
                                                                            title={title}>saved</span>
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const createMockHistory = async (statesCount = 1, currentIndex = statesCount - 1) => {
  const initialState = {
    actionDescription: 'Initial State',
    signature: 'sig-initial',
    executionTimestamp: Date.now(),
    mceData: {} as any,
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

const renderSessionPanel = async ({
                                    history,
                                    savedStateSignature,
                                    onGoTo = vi.fn(),
                                    onClearHistory = vi.fn(),
                                    historyVersion = 0,
                                  }: {
  history: StateHistory<any>;
  savedStateSignature: string;
  onGoTo?: (index: number) => void;
  onClearHistory?: () => void;
  historyVersion?: number;
}) => {
  document.body.innerHTML = '<div id="root"></div>';
  const container = document.getElementById('root')!;
  const root = createRoot(container);

  let props = {
    history,
    savedStateSignature,
    onGoTo,
    onClearHistory,
    historyVersion,
  };

  const renderCurrent = async () => {
    await act(async () => {
      root.render(<SessionPanel {...props} />);
    });
  };

  await renderCurrent();

  return {
    container,
    update: async (newProps: Partial<typeof props>) => {
      props = {...props, ...newProps};
      await renderCurrent();
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
    }
  };
};

const clickElement = async (element: Element | null) => {
  expect(element).not.toBeNull();
  await act(async () => {
    (element as HTMLElement).dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });
};

describe('SessionPanel', () => {

  it('does not show Clear History button when there is only one state', async () => {
    const history = await createMockHistory(1);
    const savedSignature = history.getCurrentStateSignature();

    const panel = await renderSessionPanel({
      history,
      savedStateSignature: savedSignature,
    });

    expect(panel.container.textContent).not.toContain('Clear History');

    await panel.unmount();
  });

  it('does not show Clear History button when current state is not saved state', async () => {
    const history = await createMockHistory(2, 1); // 2 states, current is the 2nd one
    const savedSignature = history.getHistory()[0].signature; // saved is the 1st one

    const panel = await renderSessionPanel({
      history,
      savedStateSignature: savedSignature,
    });

    expect(panel.container.textContent).not.toContain('Clear History');

    await panel.unmount();
  });

  it('shows Clear History button when current state is saved state and history has multiple states', async () => {
    const history = await createMockHistory(2, 0); // 2 states, current is the 1st one (saved)
    const savedSignature = history.getCurrentStateSignature();

    const panel = await renderSessionPanel({
      history,
      savedStateSignature: savedSignature,
    });

    const button = panel.container.querySelector('button.btn-primary');
    expect(button).not.toBeNull();
    expect(button?.textContent?.trim()).toBe('Clear History');

    await panel.unmount();
  });

  it('calls onClearHistory when button is clicked', async () => {
    const history = await createMockHistory(2, 0);
    const savedSignature = history.getCurrentStateSignature();
    const onClearHistory = vi.fn();

    const panel = await renderSessionPanel({
      history,
      savedStateSignature: savedSignature,
      onClearHistory,
    });

    const button = panel.container.querySelector('button.btn-primary');
    expect(button).not.toBeNull();

    await clickElement(button);

    expect(onClearHistory).toHaveBeenCalledTimes(1);

    await panel.unmount();
  });

  it('calls onGoTo with expected index when clicking status, signature, and description cells', async () => {
    const history = await createMockHistory(3, 2);
    const savedSignature = history.getCurrentStateSignature();
    const onGoTo = vi.fn();

    const panel = await renderSessionPanel({
      history,
      savedStateSignature: savedSignature,
      onGoTo,
    });

    const statusCells = panel.container.querySelectorAll('tbody tr td:first-child > div');
    expect(statusCells).toHaveLength(3);
    await clickElement(statusCells[0]);

    const signatureCell = panel.container.querySelector('tbody tr:nth-child(2) td:nth-child(2) span');
    await clickElement(signatureCell);

    const descriptionCell = panel.container.querySelector('tbody tr:nth-child(3) td:nth-child(3) span');
    await clickElement(descriptionCell);

    expect(onGoTo).toHaveBeenCalledTimes(3);
    expect(onGoTo).toHaveBeenNthCalledWith(1, 2);
    expect(onGoTo).toHaveBeenNthCalledWith(2, 1);
    expect(onGoTo).toHaveBeenNthCalledWith(3, 0);

    await panel.unmount();
  });

  it('renders saved and current markers', async () => {
    const history = await createMockHistory(2, 1);
    const savedSignature = history.getCurrentStateSignature();

    const panel = await renderSessionPanel({
      history,
      savedStateSignature: savedSignature,
    });

    const statusCells = panel.container.querySelectorAll('tbody tr td:first-child > div');
    expect(statusCells).toHaveLength(2);
    expect(statusCells[0].querySelector('[data-icon="current"]')).not.toBeNull();
    expect(statusCells[0].querySelector('[data-icon="saved"]')).not.toBeNull();
    expect(statusCells[1].querySelector('[data-icon="not-current"]')).not.toBeNull();

    await panel.unmount();
  });

  it('applies muted styling to redo rows when current state is not latest', async () => {
    const history = await createMockHistory(3, 1);
    const savedSignature = history.getCurrentStateSignature();

    const panel = await renderSessionPanel({
      history,
      savedStateSignature: savedSignature,
    });

    const redoSignature = panel.container.querySelector('tbody tr:nth-child(1) td:nth-child(2) span');
    const redoDescription = panel.container.querySelector('tbody tr:nth-child(1) td:nth-child(3) span');
    const nonRedoSignature = panel.container.querySelector('tbody tr:nth-child(3) td:nth-child(2) span');

    expect(redoSignature).not.toBeNull();
    expect(redoDescription).not.toBeNull();
    expect(nonRedoSignature).not.toBeNull();

    expect(redoSignature?.classList.contains('text-muted')).toBe(true);
    expect(redoDescription?.classList.contains('text-muted')).toBe(true);
    expect(nonRedoSignature?.classList.contains('text-muted')).toBe(false);

    await panel.unmount();
  });

  it('shows timestamp fallback when executionTimestamp is absent', async () => {
    const history = await createMockHistory(2, 1);
    (history.getHistory()[0] as any).executionTimestamp = undefined;
    const savedSignature = history.getCurrentStateSignature();

    const panel = await renderSessionPanel({
      history,
      savedStateSignature: savedSignature,
    });

    const fallbackTimestamp = Array.from(panel.container.querySelectorAll('tbody tr td:nth-child(4) span'))
      .find((span) => span.textContent === '—');

    expect(fallbackTimestamp).not.toBeNull();
    expect(fallbackTimestamp?.classList.contains('text-muted')).toBe(true);

    await panel.unmount();
  });

  it('refreshes displayed history when historyVersion is updated', async () => {
    const history = await createMockHistory(1);
    const savedSignature = history.getCurrentStateSignature();

    const panel = await renderSessionPanel({
      history,
      savedStateSignature: savedSignature,
      historyVersion: 0,
    });

    expect(panel.container.textContent).not.toContain('Action 1');
    expect(panel.container.textContent).not.toContain('sig-1');

    await history.do({
      execute: async (state: any) => ({...state, signature: 'sig-1'}),
      description: () => 'Action 1',
    });
    const latestSignature = history.getHistory()[1].signature;

    await panel.update({historyVersion: 1});

    expect(panel.container.textContent).toContain('Action 1');
    expect(panel.container.textContent).toContain(latestSignature);

    await panel.unmount();
  });
});
