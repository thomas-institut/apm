/**
 * @vitest-environment happy-dom
 */

import React, {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import EditionComposer from '@/ReactAPM/Pages/EditionComposer/EditionComposer';
import {AppContext, AppContextProps} from '@/ReactAPM/App';

const {mockRouteParams, mockApiClient} = vi.hoisted(() => ({
  mockRouteParams: {id: '1', version: 'v1' as string | undefined},
  mockApiClient: {getSingleChunkData: vi.fn()},
}));

vi.mock('react-router', () => ({
  useParams: () => mockRouteParams,
}));

vi.mock('@/CtData/CtData', () => ({
  CtData: {
    getCleanAndUpdatedCtData: (ctData: unknown) => ctData,
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
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

vi.mock('@/ReactAPM/Pages/MceComposer/StatusPage', () => ({
  StatusPage: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

vi.mock('@/ReactAPM/Components/ApmLogo/ApmLogo', () => ({default: () => null}));
vi.mock('@/ReactAPM/Components/EditableTextField', () => ({
  default: ({text}: {text: string}) => <h1 data-testid="edition-title">{text}</h1>,
}));
vi.mock('@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextPanel', () => ({default: () => null}));
vi.mock('@/ReactAPM/Pages/EditionComposer/CtPanel/CtPanel', () => ({default: () => null}));
vi.mock('@/ReactAPM/Pages/EditionComposer/ApparatusPanel/ApparatusPanel', () => ({ApparatusPanel: () => null}));
vi.mock('@/ReactAPM/Pages/EditionComposer/AdminPanel/AdminPanel', () => ({
  default: ({tableId, versionTimeStamp}: {tableId: number, versionTimeStamp: string}) =>
    <div data-testid="edition-admin">{tableId}:{versionTimeStamp}</div>,
}));
vi.mock('@/ReactAPM/Components/PreviewPanel/PreviewPanel', () => ({
  default: ({edition}: {edition: {mainText: string}}) => <div data-testid="edition-preview">{edition.mainText}</div>,
}));
vi.mock('react-bootstrap', () => ({Spinner: () => <span/>}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('EditionComposer route changes', () => {
  let root: Root;
  let container: HTMLDivElement;

  const renderComposer = () => root.render(
    <AppContext.Provider value={{apiClient: mockApiClient} as unknown as AppContextProps}>
      <EditionComposer/>
    </AppContext.Provider>,
  );

  beforeEach(() => {
    mockRouteParams.id = '1';
    mockRouteParams.version = 'v1';
    mockApiClient.getSingleChunkData.mockReset();
    mockApiClient.getSingleChunkData.mockImplementation(async (tableId: number, version: string) => ({
      ctData: {tableId, title: `Edition ${tableId} ${version}`, archived: false, sigla: [], lang: 'en'},
      versions: [],
      isLatestVersion: true,
      timeStamp: version,
    }));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('loads new table data and resets the editor when id or version changes', async () => {
    await act(async () => renderComposer());

    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edition 1 v1');
    expect(mockApiClient.getSingleChunkData).toHaveBeenCalledWith(1, 'v1');

    await act(async () => {
      mockRouteParams.version = 'v2';
      renderComposer();
    });

    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edition 1 v2');
    expect(container.querySelector('[data-testid="edition-admin"]')?.textContent).toBe('1:v2');
    expect(mockApiClient.getSingleChunkData).toHaveBeenLastCalledWith(1, 'v2');

    await act(async () => {
      mockRouteParams.id = '2';
      renderComposer();
    });

    expect(container.querySelector('[data-testid="edition-title"]')?.textContent).toBe('Edition 2 v2');
    expect(container.querySelector('[data-testid="edition-preview"]')?.textContent).toBe('Edition 2 v2');
    expect(mockApiClient.getSingleChunkData).toHaveBeenLastCalledWith(2, 'v2');
    expect(mockApiClient.getSingleChunkData).toHaveBeenCalledTimes(3);
  });
});