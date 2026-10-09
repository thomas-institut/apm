/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import EditionComposer from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {AppContext, AppContextProps} from '@/ReactAPM/App';
import {StateHistory} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {OperationalError, ValidationError} from '@/lib/Error/SystemError';

interface MockEditionResponse {
  ctData: {tableId: number, title: string, archived: boolean, sigla: never[], lang: string, chunkId: string};
  versions: never[];
  isLatestVersion: boolean;
  timeStamp: string;
}

const {mockRouteParams, mockApiClient} = vi.hoisted(() => ({
  mockRouteParams: {id: '1', version: 'v1' as string | undefined},
  mockApiClient: {
    getSingleChunkData: vi.fn<(tableId: number, version: string) => Promise<MockEditionResponse>>(),
  },
}));

vi.mock('react-router', () => ({
  useParams: () => mockRouteParams,
}));

vi.mock('@/CtData/CtData', () => ({
  CtData: {
    getCleanAndUpdatedCtData: (ctData: unknown) => ctData,
    updateTitle: (ctData: {title: string}, newTitle: string) => {
      ctData.title = newTitle;
      return ctData;
    },
  },
}));

vi.mock('@/Edition/EditionGenerator/CtDataEditionGenerator', () => ({
  CtDataEditionGenerator: class {
    constructor(private readonly options: {ctData: {title: string}}) {}

    generateEdition() {
      return {mainText: this.options.ctData.title, apparatuses: []};
    }
  },
}));

vi.mock('@/ReactAPM/Components/PanelUI/PanelSpec', () => ({
  panelsFromSpecs: (specs: {panel: string, key: string, content: React.ReactNode}[], panel: string) =>
    specs.filter(spec => spec.panel === panel).map(spec => <div key={spec.key}>{spec.content}</div>),
}));

vi.mock('@/ReactAPM/Components/PanelUI/SplitPanels', () => ({
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

vi.mock('@/ReactAPM/Components/PanelUI/TabPanel', () => ({
  default: ({children, activeTabKey, onClickTab}: {children: React.ReactNode, activeTabKey: string, onClickTab?: (tabKey: string) => void}) =>
    <div data-testid="tab-panel" data-active-tab={activeTabKey}>
      <button onClick={() => onClickTab?.('cTable')}>Select Collation</button>
      <button onClick={() => onClickTab?.('preview')}>Select Preview</button>
      {children}
    </div>,
}));

vi.mock('@/ReactAPM/Pages/MceComposer/StatusPage', () => ({
  StatusPage: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

vi.mock('@/ReactAPM/Components/ApmLogo/ApmLogo', () => ({default: () => null}));
vi.mock('@/ReactAPM/Components/EditableTextField', () => ({
  default: ({text, disabled, onConfirm, validator}: {
    text: string,
    disabled?: boolean,
    onConfirm: (newText: string) => void,
    validator?: (text: string) => true | string,
  }) => <>
    <h1 data-testid="edition-title" data-disabled={disabled ?? false}>{text}</h1>
    <button data-testid="confirm-title-edit" disabled={disabled} onClick={() => onConfirm('Edited title')}>Edit title</button>
    <button data-testid="invalid-title-edit" disabled={disabled} onClick={() => {
      if (validator?.('   ') === true) {
        onConfirm('   ');
      }
    }}>Invalid title</button>
  </>,
}));
vi.mock('@/ReactAPM/Pages/MceComposer/SessionsPanel/SessionPanel', () => ({
  default: ({history, onGoTo}: {
    history: {getHistory: () => {actionDescription: string}[]},
    onGoTo: (index: number) => void,
  }) => <div data-testid="session-panel">
    {history.getHistory().map((item, index) => <button key={index} data-testid={`session-state-${index}`}
                                                       onClick={() => onGoTo(index)}>{item.actionDescription}</button>)}
  </div>,
}));
vi.mock('@/ReactAPM/Pages/MceComposer/BugWarningButton', () => ({
  default: ({foundBugDescription}: {foundBugDescription: string}) =>
    <div data-testid="bug-warning">{foundBugDescription}</div>,
}));
vi.mock('@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanel', () => ({default: () => null}));
vi.mock('@/ReactAPM/Pages/EditionComposer/CtPanel/CtPanel', () => ({default: () => null}));
vi.mock('@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusPanel', () => ({ApparatusPanel: () => null}));
vi.mock('@/ReactAPM/Pages/EditionComposer/AdminPanel/AdminPanel', () => ({
  default: ({tableId, versionTimeStamp, loadingNewVersion}: {tableId: number, versionTimeStamp: string, loadingNewVersion: boolean}) =>
    <div data-testid="edition-admin" data-loading-new-version={loadingNewVersion}>{tableId}:{versionTimeStamp}</div>,
}));
vi.mock('@/ReactAPM/Components/PreviewPanel/PreviewPanel', () => ({
  default: ({edition}: {edition: {mainText: string}}) => <div data-testid="edition-preview">{edition.mainText}</div>,
}));
vi.mock('react-bootstrap', () => ({Spinner: () => <span data-testid="spinner"/>}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('EditionComposer version changes', () => {
  let root: Root;
  let container: HTMLDivElement;

  const makeResult = (tableId: number, version: string): MockEditionResponse => ({
    ctData: {tableId, title: `Edition ${tableId} ${version}`, archived: false, sigla: [], lang: 'en', chunkId: `chunk-${tableId}`},
    versions: [],
    isLatestVersion: true,
    timeStamp: version,
  });

  const renderComposer = () => root.render(
    <AppContext.Provider value={{apiClient: mockApiClient} as unknown as AppContextProps}>
      <EditionComposer/>
    </AppContext.Provider>,
  );

  beforeEach(() => {
    mockRouteParams.id = '1';
    mockRouteParams.version = 'v1';
    mockApiClient.getSingleChunkData.mockReset();
    mockApiClient.getSingleChunkData.mockImplementation(async (tableId, version) => makeResult(tableId, version));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('keeps the current editor visible and tabs selected until a new version loads', async () => {
    await act(async () => renderComposer());

    const tabPanels = container.querySelectorAll<HTMLElement>('[data-testid="tab-panel"]');
    await act(async () => {
      tabPanels[0].querySelector<HTMLButtonElement>('button')!.click();
      tabPanels[1].querySelectorAll<HTMLButtonElement>('button')[1].click();
    });
    expect(tabPanels[0].dataset.activeTab).toBe('cTable');
    expect(tabPanels[1].dataset.activeTab).toBe('preview');

    let resolveNewVersion!: (result: MockEditionResponse) => void;
    mockApiClient.getSingleChunkData.mockImplementation((tableId, version) => version === 'v2'
      ? new Promise(resolve => {
        resolveNewVersion = resolve;
      })
      : Promise.resolve(makeResult(tableId, version)));

    await act(async () => {
      mockRouteParams.version = 'v2';
      renderComposer();
    });

    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edition 1 v1');
    expect(container.querySelector('[data-testid="edition-title"]')?.getAttribute('data-disabled')).toBe('true');
    expect(container.querySelector('[data-testid="edition-preview"]')?.textContent).toBe('Edition 1 v1');
    expect(container.querySelector('.version-loading')?.textContent).toContain('Loading data...');
    expect(container.querySelector('.version-loading [data-testid="spinner"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="edition-admin"]')?.getAttribute('data-loading-new-version')).toBe('true');
    expect(tabPanels[0].dataset.activeTab).toBe('cTable');
    expect(tabPanels[1].dataset.activeTab).toBe('preview');

    await act(async () => {
      resolveNewVersion(makeResult(1, 'v2'));
    });

    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edition 1 v2');
    expect(container.querySelector('[data-testid="edition-title"]')?.getAttribute('data-disabled')).toBe('false');
    expect(container.querySelector('[data-testid="edition-preview"]')?.textContent).toBe('Edition 1 v2');
    expect(container.querySelector('.version-loading')).toBeNull();
    expect(tabPanels[0].dataset.activeTab).toBe('cTable');
    expect(tabPanels[1].dataset.activeTab).toBe('preview');
  });

  it('uses the full loading state when both the ID and version change', async () => {
    await act(async () => renderComposer());

    let resolveNewEdition!: (result: MockEditionResponse) => void;
    mockApiClient.getSingleChunkData.mockImplementation((tableId, version) => new Promise(resolve => {
      resolveNewEdition = () => resolve(makeResult(tableId, version));
    }));

    await act(async () => {
      mockRouteParams.id = '2';
      mockRouteParams.version = 'v2';
      renderComposer();
    });

    expect(container.textContent).toContain('Loading single chunk edition 2...');
    expect(container.querySelector('[data-testid="edition-title"]')).toBeNull();
    expect(container.querySelector('.version-loading')).toBeNull();

    await act(async () => resolveNewEdition(makeResult(2, 'v2')));
    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edition 2 v2');
  });

  it('tracks title edits and supports undo, redo, save requests, and reset', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await act(async () => renderComposer());

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="confirm-title-edit"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edited title');
    expect(container.querySelector('[data-testid="session-state-1"]')?.textContent).toBe('Update title to Edited title');

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Save"]')!.click());
    expect(logSpy).toHaveBeenCalledWith('Save requested for edition 1');

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Undo"]')!.click());
    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edition 1 v1');
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Redo"]')!.click());
    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edited title');
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Reset"]')!.click());
    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edition 1 v1');
  });

  it('does not send invalid titles to the action', async () => {
    const historyDoSpy = vi.spyOn(StateHistory.prototype, 'do');
    await act(async () => renderComposer());

    await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="invalid-title-edit"]')!.click());

    expect(historyDoSpy).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="bug-warning"]')).toBeNull();
  });

  it('reports operational action errors without marking them as bugs', async () => {
    vi.spyOn(StateHistory.prototype, 'do').mockImplementation(async () => {
      throw new OperationalError('temporary issue');
    });
    await act(async () => renderComposer());

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="confirm-title-edit"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(container.querySelector('.action-error-message')?.textContent).toContain('OperationalError: temporary issue');
    expect(container.querySelector('[data-testid="bug-warning"]')).toBeNull();
  });

  it('treats action validation errors as bugs', async () => {
    vi.spyOn(StateHistory.prototype, 'do').mockImplementation(async () => {
      throw new ValidationError('unexpected invalid title');
    });
    await act(async () => renderComposer());

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="confirm-title-edit"]')!.click();
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(container.querySelector('[data-testid="bug-warning"]')?.textContent).toContain('UpdateTitleAction failed. ValidationError: unexpected invalid title');
    expect(container.querySelector('.action-error-message')).toBeNull();
  });
});