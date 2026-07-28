/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vitest';
import MceComposer, {isMceDataEditingAllowed} from '@/ReactAPM/Pages/MceComposer/MceComposer';
import {AppContext, AppContextProps} from '@/ReactAPM/App';
import {WebStorageKeyCache} from '@/toolbox/KeyCache/WebStorageKeyCache';
import {StateHistory} from '@/ReactAPM/ToolBox/StateHistory/StateHistory';
import {MceData} from '@/MceData/MceData';
import {MceDataEditionGenerator} from '@/MceData/MceDataEditionGenerator';

const mockRouteParams = vi.hoisted(() => ({id: 'new'}));
const mockedAddChunk = vi.hoisted(() => ({
  callback: undefined as undefined | ((tableId: number, version?: string) => Promise<true | string>),
}));
const mockedEditorHandlers = vi.hoisted(() => ({
  changeTitle: undefined as undefined | ((title: string) => Promise<boolean | undefined>),
  changeSiglaGroup: undefined as undefined | ((siglaGroupIndex: number, group: {siglum: string, witnesses: number[]}) => Promise<boolean>),
  clearHistory: undefined as undefined | (() => void),
  deleteChunk: undefined as undefined | ((chunkIndex: number) => Promise<boolean>),
  deleteSiglaGroup: undefined as undefined | ((siglaGroupIndex: number) => Promise<boolean>),
  moveChunk: undefined as undefined | ((chunkPosition: number, direction: 'up' | 'down') => Promise<boolean>),
  onGoTo: undefined as undefined | ((index: number) => void),
  save: undefined as undefined | (() => Promise<void>),
  setChunkBreak: undefined as undefined | ((chunkPosition: number, newBreak: string) => Promise<boolean>),
  setIncludeInAutoMarginalFoliation: undefined as undefined | ((witnessIndex: number, newState: boolean) => Promise<boolean>),
  setSiglum: undefined as undefined | ((witnessIndex: number, newSiglum: string) => Promise<boolean>),
  titleValidator: undefined as undefined | ((title: string) => true | string),
  updateChunk: undefined as undefined | ((chunkIndex: number) => Promise<true | string>),
}));
vi.mock('react-router', () => ({
  useParams: () => mockRouteParams,
  useNavigate: () => vi.fn(),
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

vi.mock('@/ReactAPM/Pages/MceComposer/ChunksPanel/ChunksPanel', () => ({
  default: ({chunks, deleteChunk, moveChunk, setChunkBreak, updateChunk}: {
    chunks: {chunkId: string, title: string}[],
    deleteChunk: (chunkIndex: number) => Promise<boolean>,
    moveChunk: (chunkPosition: number, direction: 'up' | 'down') => Promise<boolean>,
    setChunkBreak: (chunkPosition: number, newBreak: string) => Promise<boolean>,
    updateChunk: (chunkIndex: number) => Promise<true | string>,
  }) => {
    mockedEditorHandlers.deleteChunk = deleteChunk;
    mockedEditorHandlers.moveChunk = moveChunk;
    mockedEditorHandlers.setChunkBreak = setChunkBreak;
    mockedEditorHandlers.updateChunk = updateChunk;
    return <div>{chunks.map((chunk) => <div key={chunk.chunkId}>{chunk.title}</div>)}</div>;
  }
}));

vi.mock('@/ReactAPM/Pages/MceComposer/WitnessesPanel/WitnessesPanel', () => ({
  default: ({onChangeIncludeInAutoMarginalFoliation, onChangeSiglaGroup, onChangeSiglum, onDeleteSiglaGroup}: {
    onChangeIncludeInAutoMarginalFoliation?: (witnessIndex: number, newState: boolean) => Promise<boolean>,
    onDeleteSiglaGroup?: (siglaGroupIndex: number) => Promise<boolean>,
    onChangeSiglaGroup?: (siglaGroupIndex: number, group: {siglum: string, witnesses: number[]}) => Promise<boolean>,
    onChangeSiglum?: (witnessIndex: number, newSiglum: string) => Promise<boolean>,
  }) => {
    mockedEditorHandlers.changeSiglaGroup = onChangeSiglaGroup;
    mockedEditorHandlers.deleteSiglaGroup = onDeleteSiglaGroup;
    mockedEditorHandlers.setIncludeInAutoMarginalFoliation = onChangeIncludeInAutoMarginalFoliation;
    mockedEditorHandlers.setSiglum = onChangeSiglum;
    return <div>
      <button type="button" data-testid="delete-sigla-group" onClick={() => onDeleteSiglaGroup?.(0)}>delete group</button>
      <button type="button" data-testid="change-sigla-group"
              onClick={() => onChangeSiglaGroup?.(-1, {siglum: 'Gx', witnesses: [0, 1]})}>change group</button>
    </div>;
  }
}));

vi.mock('@/ReactAPM/Pages/MceComposer/AddChunksPanel/AddChunksPanel', () => ({
  default: ({addChunk}: {addChunk: (tableId: number, version?: string) => Promise<true | string>}) => {
    mockedAddChunk.callback = addChunk;
    return <div>add chunks</div>;
  }
}));

vi.mock('@/ReactAPM/Pages/MceComposer/MceComposerSaveButton', () => ({
  default: ({onClick, saveError}: {onClick: () => Promise<void>, saveError: string | null}) => {
    mockedEditorHandlers.save = onClick;
    return <div>
      save
      {saveError !== null && <div data-testid="save-error">{saveError}</div>}
    </div>;
  }
}));

vi.mock('@/ReactAPM/Components/EditableTextField', () => ({
  default: ({
              text,
              onConfirm,
              validator,
            }: {
    text: string,
    onConfirm: (t: string) => Promise<boolean | undefined>,
    validator?: (text: string) => true | string,
  }) => {
    mockedEditorHandlers.changeTitle = onConfirm;
    mockedEditorHandlers.titleValidator = validator;
    return <div data-testid="editable-text-field" onClick={() => onConfirm('New Title Action')}>{text}</div>;
  }
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

vi.mock('@/ReactAPM/Pages/MceComposer/MainTextPanel/MainTextPanel', () => ({
  default: ({
              onClickRegenerate,
              editionOutOfDate,
              generationProgress,
            }: {
    onClickRegenerate: () => void,
    editionOutOfDate: boolean,
    generationProgress: number | null,
  }) => (
    <div>
      <button type="button" onClick={onClickRegenerate}>Regenerate</button>
      <span data-testid="main-text-out-of-date">{editionOutOfDate ? 'true' : 'false'}</span>
      <span data-testid="main-text-generation-progress">{generationProgress === null ? 'null' : `${generationProgress}`}</span>
    </div>
  )
}));

// Mock SessionPanel to avoid interval timers in tests
vi.mock('@/ReactAPM/Pages/MceComposer/SessionsPanel/SessionPanel', () => ({
  default: ({onClearHistory, onGoTo}: {onClearHistory: () => void, onGoTo: (index: number) => void}) => {
    mockedEditorHandlers.clearHistory = onClearHistory;
    mockedEditorHandlers.onGoTo = onGoTo;
    return <div>session</div>;
  }
}));

// Mock PreviewPanel to avoid stylesheet errors and heavy rendering
vi.mock('@/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPanel', () => ({
  default: () => <div>preview</div>
}));

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

interface DeferredPromise<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

const createDeferredPromise = <T,>(): DeferredPromise<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
};

const flushEffects = async (times: number = 4) => {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
};

const getChunkApiResponse = (tableId: number) => {
  return {
    ctData: {
      chunkId: `chunk-${tableId}`,
      lang: 'la',
      type: 'edition',
      title: `Chunk ${tableId}`,
      witnesses: [],
      sigla: [],
    },
    isLatestVersion: true,
    timeStamp: `2026-01-01 00:00:${(tableId % 60).toString().padStart(2, '0')}`,
  };
};

afterEach(() => {
  mockRouteParams.id = 'new';
});

describe('isMceDataEditingAllowed', () => {
  it.each([
    ['start', false],
    ['loadingMce', false],
    ['loadingSingleChunks', false],
    ['loaded', true],
    ['error', false],
  ] as const)('allows editing for status %s: %s', (mceComposerStatus, expected) => {
    expect(isMceDataEditingAllowed(mceComposerStatus)).toBe(expected);
  });
});

describe('MceComposer', () => {
  it('accepts a non-Latin first chunk', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const getSingleChunkData = vi.fn().mockResolvedValue({
      ctData: {
        chunkId: 'greek-chunk',
        lang: 'grc',
        type: 'edition',
        title: 'Greek chunk',
        witnesses: [],
        sigla: [],
      },
      isLatestVersion: true,
      timeStamp: '2026-01-01 00:00:00',
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
        apiMceGetData: vi.fn(),
        getSingleChunkData,
        getEntityName: vi.fn(),
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
      await flushEffects();
    });

    await act(async () => {
      (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    });

    let result: true | string | undefined;
    await act(async () => {
      result = await mockedAddChunk.callback!(42);
    });

    expect(result).toBe(true);
    expect(getSingleChunkData).toHaveBeenCalledWith(42, '');
  });

  it('prevents adding an already included table', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const getSingleChunkData = vi.fn().mockResolvedValue(getChunkApiResponse(42));
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
        apiMceGetData: vi.fn(),
        getSingleChunkData,
        getEntityName: vi.fn(),
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
      await flushEffects();
    });

    await act(async () => {
      (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    });

    let firstResult: true | string | undefined;
    await act(async () => {
      firstResult = await mockedAddChunk.callback!(42);
    });

    let secondResult: true | string | undefined;
    await act(async () => {
      secondResult = await mockedAddChunk.callback!(42);
    });

    expect(firstResult).toBe(true);
    expect(secondResult).toBe('Table 42 is already included in this MCE');
    expect(getSingleChunkData).toHaveBeenCalledTimes(1);
    expect(getSingleChunkData).toHaveBeenCalledWith(42, '');

    await act(async () => {
      root.unmount();
    });
  });

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
        apiMceGetData: vi.fn(),
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

  it('regenerates the latest data when a stale generation completes', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const firstGenerationResponse = createDeferredPromise<any>();
    const createEditionResult = (label: string) => ({
      lang: 'la',
      info: {
        source: 'test',
        tableId: -1,
        singleChunk: false,
        chunkId: label,
        baseWitnessIndex: 0,
        editionId: -1,
      },
      mainText: [],
      apparatuses: [],
      witnesses: [],
      siglaGroups: [],
      foliationChanges: null,
      metadata: {},
    });

    const generateEditionSpy = vi.spyOn(MceDataEditionGenerator.prototype, 'generate').mockImplementation((nextMceData) => {
      if (nextMceData.chunks.length === 1) {
        return firstGenerationResponse.promise;
      }
      return Promise.resolve(createEditionResult('B'));
    });

    const getSingleChunkData = vi.fn((tableId: number) => {
      return Promise.resolve(getChunkApiResponse(tableId));
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
        apiMceGetData: vi.fn(),
        getSingleChunkData,
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
      await flushEffects();
    });

    await act(async () => {
      await expect(mockedAddChunk.callback!(1)).resolves.toBe(true);
      await flushEffects();
    });

    expect(container.querySelector('[data-testid="main-text-out-of-date"]')?.textContent).toBe('true');

    await act(async () => {
      await expect(mockedAddChunk.callback!(2)).resolves.toBe(true);
      await flushEffects();
    });

    expect(container.querySelector('[data-testid="main-text-out-of-date"]')?.textContent).toBe('true');

    await act(async () => {
      firstGenerationResponse.resolve(createEditionResult('A'));
      await flushEffects(10);
    });

    expect(generateEditionSpy).toHaveBeenCalledTimes(2);
    expect(generateEditionSpy.mock.calls[0][0].chunks.length).toBe(1);
    expect(generateEditionSpy.mock.calls[1][0].chunks.length).toBe(2);
    expect(container.querySelector('[data-testid="main-text-out-of-date"]')?.textContent).toBe('false');

    await act(async () => {
      root.unmount();
    });
    generateEditionSpy.mockRestore();
  });

  it('loads chunks in batches of five while initializing an existing MCE', async () => {
    mockRouteParams.id = '123';
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const mceData = MceData.createEmpty();
    mceData.lang = 'la';
    mceData.chunks = Array.from({length: 12}, (_value, index) => {
      return {
        chunkId: `chunk-${index + 1}`,
        break: '',
        chunkEditionTableId: 100 + index,
        lineNumbersRestart: false,
        title: `Chunk ${index + 1}`,
        version: '',
        witnessIndices: [],
      };
    });
    mceData.chunkOrder = mceData.chunks.map((_chunk, index) => index);

    const pendingChunkResponses = new Map<number, DeferredPromise<any>>();
    const getSingleChunkDataMock = vi.fn((tableId: number) => {
      let pendingResponse = pendingChunkResponses.get(tableId);
      if (pendingResponse === undefined) {
        pendingResponse = createDeferredPromise<any>();
        pendingChunkResponses.set(tableId, pendingResponse);
      }
      return pendingResponse.promise;
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
        apiMceGetData: vi.fn().mockResolvedValue({mceData}),
        getSingleChunkData: getSingleChunkDataMock,
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
      await flushEffects();
    });

    expect(getSingleChunkDataMock).toHaveBeenCalledTimes(5);
    expect(getSingleChunkDataMock.mock.calls.slice(0, 5).map((call) => call[0])).toEqual([100, 101, 102, 103, 104]);

    await act(async () => {
      [100, 101, 102, 103, 104].forEach((tableId) => {
        pendingChunkResponses.get(tableId)!.resolve(getChunkApiResponse(tableId));
      });
      await flushEffects();
    });

    expect(getSingleChunkDataMock).toHaveBeenCalledTimes(10);
    expect(getSingleChunkDataMock.mock.calls.slice(5, 10).map((call) => call[0])).toEqual([105, 106, 107, 108, 109]);

    await act(async () => {
      [105, 106, 107, 108, 109].forEach((tableId) => {
        pendingChunkResponses.get(tableId)!.resolve(getChunkApiResponse(tableId));
      });
      await flushEffects();
    });

    expect(getSingleChunkDataMock).toHaveBeenCalledTimes(12);
    expect(getSingleChunkDataMock.mock.calls.slice(10, 12).map((call) => call[0])).toEqual([110, 111]);

    await act(async () => {
      root.unmount();
    });
  });

  it('fetches each initial chunk once in React.StrictMode', async () => {
    mockRouteParams.id = '123';
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const mceData = MceData.createEmpty();
    mceData.lang = 'la';
    mceData.chunks = [100, 101, 102].map((tableId) => {
      return {
        chunkId: `chunk-${tableId}`,
        break: '',
        chunkEditionTableId: tableId,
        lineNumbersRestart: false,
        title: `Chunk ${tableId}`,
        version: '',
        witnessIndices: [],
      };
    });
    mceData.chunkOrder = mceData.chunks.map((_chunk, index) => index);

    const pendingChunkResponses = new Map<number, DeferredPromise<any>>();
    const getSingleChunkDataMock = vi.fn((tableId: number) => {
      let pendingResponse = pendingChunkResponses.get(tableId);
      if (pendingResponse === undefined) {
        pendingResponse = createDeferredPromise<any>();
        pendingChunkResponses.set(tableId, pendingResponse);
      }
      return pendingResponse.promise;
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
        apiMceGetData: vi.fn().mockResolvedValue({mceData}),
        getSingleChunkData: getSingleChunkDataMock,
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <React.StrictMode>
          <AppContext.Provider value={appContext}>
            <MceComposer/>
          </AppContext.Provider>
        </React.StrictMode>,
      );
      await flushEffects(8);
    });

    expect(getSingleChunkDataMock.mock.calls).toHaveLength(3);
    expect(getSingleChunkDataMock.mock.calls.map((call) => call[0])).toEqual([100, 101, 102]);

    await act(async () => {
      root.unmount();
    });
  });

  it.each(['12junk', '1.5', '1e2'])('rejects malformed numeric-looking route ID %s', async (invalidId) => {
    mockRouteParams.id = invalidId;
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const apiMceGetData = vi.fn();
    const getSingleChunkData = vi.fn();
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
        apiMceGetData,
        getSingleChunkData,
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
      await flushEffects();
    });

    expect(container.textContent).toContain('Oops!');
    expect(container.textContent).toContain('Invalid MCE ID');
    expect(apiMceGetData).not.toHaveBeenCalled();
    expect(getSingleChunkData).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });

  it('loads the newly selected MCE when the route ID changes while mounted', async () => {
    mockRouteParams.id = '1';
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const apiMceGetData = vi.fn((mceId: number) => {
      const mceData = MceData.createEmpty();
      mceData.title = mceId === 1 ? 'First MCE' : 'Second MCE';
      mceData.lang = 'la';
      mceData.chunks = [{
        chunkId: mceId === 1 ? 'first-chunk' : 'second-chunk',
        break: '',
        chunkEditionTableId: mceId === 1 ? 101 : 202,
        lineNumbersRestart: false,
        title: mceId === 1 ? 'First chunk' : 'Second chunk',
        version: '',
        witnessIndices: [],
      }];
      mceData.chunkOrder = [0];
      return Promise.resolve({mceData});
    });
    const chunkResponses = new Map<number, DeferredPromise<ReturnType<typeof getChunkApiResponse>>>();
    const getSingleChunkData = vi.fn((tableId: number) => {
      let chunkResponse = chunkResponses.get(tableId);
      if (chunkResponse === undefined) {
        chunkResponse = createDeferredPromise<ReturnType<typeof getChunkApiResponse>>();
        chunkResponses.set(tableId, chunkResponse);
      }
      return chunkResponse.promise;
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
        apiMceGetData,
        getSingleChunkData,
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
      await flushEffects(8);
    });

    expect(apiMceGetData).toHaveBeenCalledTimes(1);
    expect(apiMceGetData).toHaveBeenLastCalledWith(1);
    expect(container.textContent).toContain('First MCE');
    expect(container.textContent).toContain('First chunk');
    expect(getSingleChunkData).toHaveBeenCalledWith(101, '');

    await act(async () => {
      (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
      chunkResponses.get(101)!.resolve(getChunkApiResponse(101));
      await flushEffects(8);
    });

    mockRouteParams.id = '2';
    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
      await flushEffects(8);
    });

    expect(apiMceGetData).toHaveBeenCalledTimes(2);
    expect(apiMceGetData).toHaveBeenLastCalledWith(2);
    expect(container.textContent).toContain('Second MCE');
    expect(container.textContent).toContain('Second chunk');
    expect(container.textContent).not.toContain('First MCE');
    expect(container.textContent).not.toContain('First chunk');
    expect(getSingleChunkData).toHaveBeenCalledWith(202, '');

    await act(async () => {
      chunkResponses.get(202)!.resolve(getChunkApiResponse(202));
      await flushEffects(8);
    });

    await act(async () => {
      root.unmount();
    });
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
        apiMceGetData: vi.fn(),
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

  it('passes a validator for title edits that rejects empty trimmed titles', async () => {
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
        apiMceGetData: vi.fn(),
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

    expect(mockedEditorHandlers.titleValidator).toBeDefined();
    expect(mockedEditorHandlers.titleValidator?.('   ')).toBe('Title must have a non-empty value');
    expect(mockedEditorHandlers.titleValidator?.('  Valid title  ')).toBe(true);

    await act(async () => {
      root.unmount();
    });
  });

  it('prevents concurrent mceData edits', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const chunkResponse = createDeferredPromise<ReturnType<typeof getChunkApiResponse>>();
    const historyDoSpy = vi.spyOn(StateHistory.prototype, 'do');
    const getSingleChunkData = vi.fn(() => chunkResponse.promise);
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
        apiMceGetData: vi.fn(),
        getSingleChunkData,
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
      await flushEffects();
    });

    await act(async () => {
      (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    });

    const firstAddPromise = mockedAddChunk.callback!(1);
    await flushEffects();

    await act(async () => {
      await expect(mockedAddChunk.callback!(2)).resolves.toBe('Cannot modify MCE data while another edit is in progress');
      await expect(mockedEditorHandlers.changeTitle!('Concurrent title')).resolves.toBe(false);
    });

    expect(getSingleChunkData).toHaveBeenCalledTimes(1);
    expect(historyDoSpy).not.toHaveBeenCalled();

    await act(async () => {
      chunkResponse.resolve(getChunkApiResponse(1));
      await expect(firstAddPromise).resolves.toBe(true);
    });

    expect(historyDoSpy).toHaveBeenCalledTimes(1);
    historyDoSpy.mockRestore();
  });

  it('prevents all mceData edits while saving', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const saveRequest = createDeferredPromise<{result: string, id: number}>();
    const historyDoSpy = vi.spyOn(StateHistory.prototype, 'do');
    const historyUndoSpy = vi.spyOn(StateHistory.prototype, 'undo');
    const historyRedoSpy = vi.spyOn(StateHistory.prototype, 'redo');
    const historyGoToStateSpy = vi.spyOn(StateHistory.prototype, 'goToState');
    const historyClearSpy = vi.spyOn(StateHistory.prototype, 'clear');
    const getSingleChunkData = vi.fn();
    const apiMceSave = vi.fn(() => saveRequest.promise);
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
        apiMceGetData: vi.fn(),
        apiMceSave,
        getSingleChunkData,
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
      await flushEffects();
    });

    await act(async () => {
      await mockedEditorHandlers.changeTitle!('Changed title');
    });
    historyDoSpy.mockClear();

    let savePromise!: Promise<void>;
    await act(async () => {
      savePromise = mockedEditorHandlers.save!();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(apiMceSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      await expect(mockedAddChunk.callback!(1)).resolves.toBe('Cannot modify MCE data while saving');
      await expect(mockedEditorHandlers.deleteChunk!(0)).resolves.toBe(false);
      await expect(mockedEditorHandlers.moveChunk!(0, 'up')).resolves.toBe(false);
      await expect(mockedEditorHandlers.setChunkBreak!(0, 'paragraph')).resolves.toBe(false);
      await expect(mockedEditorHandlers.updateChunk!(0)).resolves.toBe('Cannot modify MCE data while saving');
      await expect(mockedEditorHandlers.setSiglum!(0, 'A')).resolves.toBe(false);
      await expect(mockedEditorHandlers.setIncludeInAutoMarginalFoliation!(0, true)).resolves.toBe(false);
      await expect(mockedEditorHandlers.deleteSiglaGroup!(0)).resolves.toBe(false);
      await expect(mockedEditorHandlers.changeSiglaGroup!(-1, {siglum: 'G', witnesses: []})).resolves.toBe(false);
      await mockedEditorHandlers.changeTitle!('Another title');
      mockedEditorHandlers.onGoTo!(0);
      mockedEditorHandlers.clearHistory!();
      (container.querySelector('.icon-btn[title^="Undo"]') as HTMLElement).click();
      (container.querySelector('.icon-btn[title^="Redo"]') as HTMLElement).click();
      (container.querySelector('.icon-btn[title="Click to revert to last saved version"]') as HTMLElement).click();
    });

    expect(historyDoSpy).not.toHaveBeenCalled();
    expect(historyUndoSpy).not.toHaveBeenCalled();
    expect(historyRedoSpy).not.toHaveBeenCalled();
    expect(historyGoToStateSpy).not.toHaveBeenCalled();
    expect(historyClearSpy).not.toHaveBeenCalled();
    expect(getSingleChunkData).not.toHaveBeenCalled();

    await act(async () => {
      saveRequest.resolve({result: 'Success', id: 1});
      await savePromise;
    });

    historyDoSpy.mockRestore();
    historyUndoSpy.mockRestore();
    historyRedoSpy.mockRestore();
    historyGoToStateSpy.mockRestore();
    historyClearSpy.mockRestore();
    vi.useRealTimers();
  });

  it('handles rejected save requests and keeps unsaved changes', async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    const saveRequest = createDeferredPromise<{result: string, id: number}>();
    const apiMceSave = vi.fn(() => saveRequest.promise);
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
        apiMceGetData: vi.fn(),
        apiMceSave,
      } as any,
      versionTag: 'test',
    };

    await act(async () => {
      root.render(
        <AppContext.Provider value={appContext}>
          <MceComposer/>
        </AppContext.Provider>,
      );
      await flushEffects();
    });

    await act(async () => {
      await mockedEditorHandlers.changeTitle!('Changed title');
    });

    const revertButtonSelector = '.icon-btn[title="Click to revert to last saved version"]';
    expect((container.querySelector(revertButtonSelector) as HTMLElement).className).toContain('highlighted');

    let savePromise!: Promise<void>;
    await act(async () => {
      savePromise = mockedEditorHandlers.save!();
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      saveRequest.reject(new Error('Network down'));
      await savePromise;
    });

    expect(apiMceSave).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-testid="save-error"]')?.textContent).toContain('Network down');
    expect((container.querySelector(revertButtonSelector) as HTMLElement).className).toContain('highlighted');

    await act(async () => {
      await expect(mockedEditorHandlers.changeTitle!('Changed title after failed save')).resolves.toBe(true);
    });

    vi.useRealTimers();
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
        apiMceGetData: vi.fn(),
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

    const historyDoSpy = vi.spyOn(StateHistory.prototype, 'do').mockImplementation(async () => {
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
        apiMceGetData: vi.fn(),
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
      await Promise.resolve();
    });

    await act(async () => {
      (container.querySelector('[data-testid="delete-sigla-group"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });

    expect(historyDoSpy).toHaveBeenCalledTimes(2);
    expect((historyDoSpy.mock.calls[0] as any[])[0].constructor.name).toBe('ChangeSiglaGroupAction');
    expect((historyDoSpy.mock.calls[1] as any[])[0].constructor.name).toBe('DeleteSiglaGroupAction');

    historyDoSpy.mockRestore();
  });
});