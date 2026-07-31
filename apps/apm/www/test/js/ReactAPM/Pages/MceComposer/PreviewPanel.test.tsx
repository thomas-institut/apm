/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot, Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import PreviewPanel from '@/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPanel';

const mockGetTypesetEdition = vi.hoisted(() => vi.fn());
const mockGetApiPdfData = vi.hoisted(() => vi.fn());
const mockGetStyleSheetsForLanguage = vi.hoisted(() => vi.fn());
const mockGetStyleSheet = vi.hoisted(() => vi.fn());
const mockNextTick = vi.hoisted(() => vi.fn());

vi.mock('react-bootstrap', () => ({
  Spinner: (props: any) => <span {...props}>spinner</span>
}));

vi.mock('@/ReactAPM/Components/PanelUI/Panel', () => ({
  default: ({children, className}: {children: React.ReactNode, className?: string}) => <div className={className}>{children}</div>
}));

vi.mock('@/ReactAPM/Components/PanelUI/PanelContent', () => ({
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@/ReactAPM/Components/PanelUI/Toolbar', () => ({
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>
}));

vi.mock('@/ReactAPM/Components/TypesetterDocumentViewer/TypesetterDocumentViewer', () => ({
  default: ({doc, placeHolder}: {doc: unknown, placeHolder: React.ReactNode}) => <div>{doc ? <span>Document ready</span> : placeHolder}</div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPageControls', () => ({
  default: () => <div>Page controls</div>
}));

vi.mock('@/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewZoomControls', () => ({
  default: () => <div>Zoom controls</div>
}));

vi.mock('@/defaults/EditionStyles/SystemStyleSheet', () => ({
  SystemStyleSheet: {
    getStyleSheetsForLanguage: (...args: unknown[]) => mockGetStyleSheetsForLanguage(...args),
    getStyleSheet: (...args: unknown[]) => mockGetStyleSheet(...args),
  }
}));

vi.mock('@/ReactAPM/Pages/MceComposer/PreviewPanel/EditionTypesettingUtilities', () => ({
  getTypesetEdition: (...args: unknown[]) => mockGetTypesetEdition(...args),
  getApiPdfData: (...args: unknown[]) => mockGetApiPdfData(...args),
}));

vi.mock('@/ReactAPM/ToolBox/NextTick', () => ({
  nextTick: () => mockNextTick()
}));

vi.mock('@/Edition/Edition', () => ({
  Edition: class {
    setFromInterface(edition: unknown) {
      return edition;
    }
  }
}));

vi.mock('@/toolbox/KeyCache/WebStorageKeyCache', () => ({
  WebStorageKeyCache: class {
    retrieve() {
      return null;
    }

    store() {
    }
  }
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

const createMockDoc = (pageCount: number) => ({
  getPageCount: () => pageCount
});

const baseEdition = {lang: 'la'} as any;

const renderPreviewPanel = async (getPdfUrl?: (data: any) => Promise<string>) => {
  document.body.innerHTML = '<div id="root"></div>';
  const container = document.getElementById('root') as HTMLElement;
  const root = createRoot(container);

  await act(async () => {
    root.render(<PreviewPanel editionKey={'edition-1'} edition={baseEdition}
                              getPdfUrl={getPdfUrl ?? vi.fn().mockResolvedValue('https://example.org/preview.pdf')}/>);
  });

  return {container, root};
};

const clickRefresh = async (container: HTMLElement) => {
  const refreshButton = container.querySelector('[title="Click to refresh preview"]') as HTMLElement;
  expect(refreshButton).toBeTruthy();
  await act(async () => {
    refreshButton.click();
  });
};

const clickPdf = async (container: HTMLElement) => {
  const pdfButton = container.querySelector('[title="Click to generate PDF in server"]') as HTMLElement;
  expect(pdfButton).toBeTruthy();
  await act(async () => {
    pdfButton.click();
  });
};

describe('PreviewPanel', () => {
  let root: Root | null = null;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockGetStyleSheetsForLanguage.mockReturnValue({
      styleA: {_metaData: {name: 'Style A'}},
      styleB: {_metaData: {name: 'Style B'}}
    });
    mockGetStyleSheet.mockReturnValue({
      getFontFamilies: () => ['Serif']
    });
    mockGetApiPdfData.mockResolvedValue({editionId: 1});
    mockNextTick.mockResolvedValue(undefined);
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        load: vi.fn().mockResolvedValue(undefined)
      }
    });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
    });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
    });
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any);
  });

  afterEach(async () => {
    if (root !== null) {
      await act(async () => {
        root?.unmount();
      });
      root = null;
    }
    warnSpy.mockRestore();
    logSpy.mockRestore();
    windowOpenSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('handles refresh success pending transitions and moves to up-to-date state', async () => {
    const refreshDeferred = createDeferredPromise<any>();
    mockGetTypesetEdition.mockReturnValue(refreshDeferred.promise);

    const rendered = await renderPreviewPanel();
    root = rendered.root;
    const {container} = rendered;

    expect(container.textContent).toContain('Out of date');

    await clickRefresh(container);

    expect(container.textContent).toContain('Refreshing preview...');
    expect(container.textContent).not.toContain('Out of date');

    await act(async () => {
      refreshDeferred.resolve(createMockDoc(2));
      await refreshDeferred.promise;
    });

    expect(container.textContent).not.toContain('Refreshing preview...');
    expect(container.textContent).toContain('PDF');

    const styleSheetSelect = container.querySelector('select') as HTMLSelectElement;
    await act(async () => {
      styleSheetSelect.value = 'styleB';
      styleSheetSelect.dispatchEvent(new Event('change', {bubbles: true}));
    });

    expect(container.textContent).toContain('Out of date');
    expect(container.textContent).not.toContain('PDF');
  });

  it('handles refresh failure with error cleanup and keeps out-of-date UI', async () => {
    const refreshDeferred = createDeferredPromise<any>();
    mockGetTypesetEdition.mockReturnValue(refreshDeferred.promise);

    const rendered = await renderPreviewPanel();
    root = rendered.root;
    const {container} = rendered;

    await clickRefresh(container);
    expect(container.textContent).toContain('Refreshing preview...');

    await act(async () => {
      refreshDeferred.reject(new Error('typesetting failed'));
      await refreshDeferred.promise.catch(() => {
      });
    });

    expect(container.textContent).not.toContain('Refreshing preview...');
    expect(container.textContent).toContain('Out of date');
    expect(container.textContent).not.toContain('PDF');
  });

  it('shows PDF generation pending state and opens URL on success', async () => {
    mockGetTypesetEdition.mockResolvedValue(createMockDoc(3));
    const pdfDeferred = createDeferredPromise<string>();
    const getPdfUrl = vi.fn().mockReturnValue(pdfDeferred.promise);

    const rendered = await renderPreviewPanel(getPdfUrl);
    root = rendered.root;
    const {container} = rendered;

    await clickRefresh(container);
    await clickPdf(container);

    expect(container.textContent).toContain('Generating PDF...');

    await act(async () => {
      pdfDeferred.resolve('https://example.org/generated.pdf');
      await pdfDeferred.promise;
    });

    expect(windowOpenSpy).toHaveBeenCalledWith('https://example.org/generated.pdf');
    expect(container.textContent).not.toContain('Generating PDF...');
    expect(container.textContent).not.toContain('PDF generation failed');
  });

  it('shows PDF failure message and clears pending state when download URL fetch fails', async () => {
    mockGetTypesetEdition.mockResolvedValue(createMockDoc(3));
    const pdfDeferred = createDeferredPromise<string>();
    const getPdfUrl = vi.fn().mockReturnValue(pdfDeferred.promise);

    const rendered = await renderPreviewPanel(getPdfUrl);
    root = rendered.root;
    const {container} = rendered;

    await clickRefresh(container);
    await clickPdf(container);
    expect(container.textContent).toContain('Generating PDF...');

    await act(async () => {
      pdfDeferred.reject(new Error('server error'));
      await pdfDeferred.promise.catch(() => {
      });
    });

    expect(container.textContent).not.toContain('Generating PDF...');
    expect(container.textContent).toContain('PDF generation failed');
    expect(windowOpenSpy).not.toHaveBeenCalled();
  });

  it('prevents repeated actions while refresh or PDF generation is pending', async () => {
    const refreshDeferred = createDeferredPromise<any>();
    const pdfDeferred = createDeferredPromise<string>();
    mockGetTypesetEdition.mockReturnValue(refreshDeferred.promise);
    const getPdfUrl = vi.fn().mockReturnValue(pdfDeferred.promise);

    const rendered = await renderPreviewPanel(getPdfUrl);
    root = rendered.root;
    const {container} = rendered;

    await clickRefresh(container);
    const refreshPending = Array.from(container.querySelectorAll('span')).find((element) => element.textContent?.includes('Refreshing preview...')) as HTMLSpanElement;
    await act(async () => {
      refreshPending.click();
    });
    expect(mockGetTypesetEdition).toHaveBeenCalledTimes(1);

    await act(async () => {
      refreshDeferred.resolve(createMockDoc(3));
      await refreshDeferred.promise;
    });

    await clickPdf(container);
    const pdfPending = Array.from(container.querySelectorAll('span')).find((element) => element.textContent?.includes('Generating PDF...')) as HTMLSpanElement;
    await act(async () => {
      pdfPending.click();
    });
    expect(getPdfUrl).toHaveBeenCalledTimes(1);
  });
});
