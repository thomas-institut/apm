/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import MceComposer from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {AppContext, AppContextProps} from '@/ReactAPM/App';
import {WebStorageKeyCache} from '@/toolbox/KeyCache/WebStorageKeyCache';

vi.mock('react-router', () => ({
  useParams: () => ({id: 'new'})
}));

vi.mock('@/ReactAPM/Components/PanelUI/SplitPanels', () => ({
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@/ReactAPM/Components/PanelUI/Panel', () => ({
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@/ReactAPM/Components/PanelUI/TabPanel', () => ({
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@/ReactAPM/Components/PanelUI/Toolbar', () => ({
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@/ReactAPM/Components/PanelUI/PanelContent', () => ({
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/ChunksPanel', () => ({
  default: () => <div>chunks</div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/WitnessesPanel', () => ({
  default: () => <div>witnesses</div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/HistoryPanel', () => ({
  default: () => <div>history</div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/SaveButton', () => ({
  default: () => <div>save</div>
}));

vi.mock('@/ReactAPM/Components/EditableTextField', () => ({
  default: ({text, onConfirm}: {text: string, onConfirm: (t: string) => void}) => (
    <div data-testid="editable-text-field" onClick={() => onConfirm('New Title Action')}>{text}</div>
  )
}));

vi.mock('@/ReactAPM/Components/ApmLogo/ApmLogo', () => ({
  default: () => <div>logo</div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/StatusPage', () => ({
  StatusPage: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('react-bootstrap-icons', () => {
  const Icon = (props: any) => <span {...props}/>;
  return {
    Arrow90degLeft: Icon,
    Arrow90degRight: Icon,
    ArrowCounterclockwise: Icon,
    ArrowsAngleContract: Icon,
    ChevronRight: Icon,
    LayoutSplit: Icon,
  };
});

vi.mock('@/ReactAPM/Components/ProgressBar/ProgressBar', () => ({
  default: ({className}: {className?: string}) => <div data-testid={className ?? 'progress-bar'}>progress</div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/MainTextPanel', () => ({
  default: ({onClickRegenerate}: {onClickRegenerate: () => void}) => (
    <button type="button" onClick={onClickRegenerate}>Regenerate</button>
  )
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('MceComposer', () => {
  it('shows edition generation progress when regenerate is clicked', async () => {
    vi.useFakeTimers();

    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const appContext: AppContextProps = {
      devMode: true,
      userId: 1,
      userName: 'Test User',
      userIsAdmin: false,
      userCanManageUsers: false,
      baseUrl: '',
      apiBaseUrl: '',
      reactAppBaseUrl: '',
      localCache: new WebStorageKeyCache('local', 'test'),
      apiClient: {
        getMceData: vi.fn(),
        getSingleChunkData: vi.fn(),
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="edition-generation-progress-bar"]')).toBeNull();

    await act(async () => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });

    expect(container.querySelector('[data-testid="edition-generation-progress-bar"]')).not.toBeNull();

    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });

    vi.useRealTimers();
  });

  it('updates undo/redo titles when actions are performed', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const appContext: AppContextProps = {
      devMode: true,
      userId: 1,
      userName: 'Test User',
      userIsAdmin: false,
      userCanManageUsers: false,
      baseUrl: '',
      apiBaseUrl: '',
      reactAppBaseUrl: '',
      localCache: new WebStorageKeyCache('local', 'test'),
      apiClient: {
        getMceData: vi.fn(),
        getSingleChunkData: vi.fn(),
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const undoBtn = container.querySelector('.icon-btn[title^="Undo"]') as HTMLElement;
    const redoBtn = container.querySelector('.icon-btn[title^="Redo"]') as HTMLElement;

    expect(undoBtn.getAttribute('title')).toBe('Undo');
    expect(redoBtn.getAttribute('title')).toBe('Redo');

    // Trigger an action (Change Title)
    await act(async () => {
      (container.querySelector('[data-testid="editable-text-field"]') as HTMLElement).click();
    });

    expect(undoBtn.getAttribute('title')).toBe('Undo Change title to "New Title Action"');
    expect(redoBtn.getAttribute('title')).toBe('Redo');

    // Undo the action
    await act(async () => {
      undoBtn.click();
    });

    expect(undoBtn.getAttribute('title')).toBe('Undo');
    expect(redoBtn.getAttribute('title')).toBe('Redo Change title to "New Title Action"');

    // Redo the action
    await act(async () => {
      redoBtn.click();
    });

    expect(undoBtn.getAttribute('title')).toBe('Undo Change title to "New Title Action"');
    expect(redoBtn.getAttribute('title')).toBe('Redo');
  });
});