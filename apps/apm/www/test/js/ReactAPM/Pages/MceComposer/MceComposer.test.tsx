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
import {StateHistory} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';

vi.mock('react-router', () => ({
  useParams: () => ({id: 'new'})
}));

vi.mock('react-bootstrap', () => {
  const PopoverComponent = ({children}: {children: React.ReactNode}) => <div>{children}</div>;
  const PopoverHeader = ({children}: {children: React.ReactNode}) => <div>{children}</div>;
  const PopoverBody = ({children}: {children: React.ReactNode}) => <div>{children}</div>;
  // Simple mock for Spinner to avoid missing export errors in tests
  const Spinner = (props: any) => <span {...props} data-testid="spinner-mock"/>;
  const Button = ({children, ...props}: any) => <button {...props}>{children}</button>;

  return {
    Form: {
      Check: ({checked, onChange}: {checked: boolean, onChange: (e: any) => void}) => (
        <input type="checkbox" checked={checked} onChange={onChange}/>
      )
    },
    OverlayTrigger: ({children, overlay}: {children: React.ReactNode, overlay: React.ReactNode}) => <>{children}{overlay}</>,
    Popover: Object.assign(PopoverComponent, {
      Header: PopoverHeader,
      Body: PopoverBody
    }),
    Spinner,
    Button,
  };
});

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
  default: ({onDeleteSiglaGroup, onChangeSiglaGroup}: {
    onDeleteSiglaGroup?: (siglaGroupIndex: number) => boolean,
    onChangeSiglaGroup?: (siglaGroupIndex: number, group: {siglum: string, witnesses: number[]}) => boolean
  }) => <div>
    <button type="button" data-testid="delete-sigla-group" onClick={() => onDeleteSiglaGroup?.(0)}>delete group</button>
    <button type="button" data-testid="change-sigla-group"
            onClick={() => onChangeSiglaGroup?.(-1, {siglum: 'Gx', witnesses: [0, 1]})}>change group</button>
  </div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/HistoryPanel', () => ({
  default: () => <div>history</div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/MceComposerSaveButton', () => ({
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
    BugFill: Icon,
    ChevronRight: Icon,
    LayoutSplit: Icon,
    Gear: Icon,
    // Icons used in SessionPanel and other components
    CheckCircleFill: Icon,
    Circle: Icon,
    Save: Icon,
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

// Mock SessionPanel to avoid interval timers in tests
vi.mock('@/ReactAPM/Pages/MceComposer/SessionPanel', () => ({
  default: () => <div>session</div>
}));

// Mock PreviewPanel to avoid stylesheet errors and heavy rendering
vi.mock('@/ReactAPM/Pages/MceComposer/PreviewPanel', () => ({
  default: () => <div>preview</div>
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
      const regenerateButton = Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Regenerate') as HTMLButtonElement;
      regenerateButton.click();
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

  it('shows a bug icon and message when an action throws', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const historyDoSpy = vi.spyOn(StateHistory.prototype, 'do').mockImplementation(() => {
      throw new Error('boom');
    });

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

    await act(async () => {
      (container.querySelector('[data-testid="editable-text-field"]') as HTMLElement).click();
    });

    expect(container.querySelector('.bug-icon')).not.toBeNull();
    expect(container.querySelector('.icon-btn[title^="Undo"]')).toBeNull();
    expect(container.querySelector('.icon-btn[title^="Redo"]')).toBeNull();
    expect(container.textContent).not.toContain('save');
    expect(container.querySelector('.icon-btn[title="Settings"]')).not.toBeNull();
    expect(container.textContent).toContain('You have discovered a bug in the software');
    expect(container.textContent).toContain('ChangeTitleAction failed');

    historyDoSpy.mockRestore();
  });

  it('wires witness panel sigla-group handlers to history actions', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const historyDoSpy = vi.spyOn(StateHistory.prototype, 'do').mockImplementation(() => {
    });

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

    await act(async () => {
      (container.querySelector('[data-testid="change-sigla-group"]') as HTMLButtonElement).click();
      (container.querySelector('[data-testid="delete-sigla-group"]') as HTMLButtonElement).click();
    });

    expect(historyDoSpy).toHaveBeenCalledTimes(2);
    expect((historyDoSpy.mock.calls[0] as any[])[0].constructor.name).toBe('ChangeSiglaGroupAction');
    expect((historyDoSpy.mock.calls[1] as any[])[0].constructor.name).toBe('DeleteSiglaGroupAction');

    historyDoSpy.mockRestore();
  });
});