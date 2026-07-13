/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import ChunksPanel from '@/ReactAPM/Pages/MceComposer/ChunksPanel';
import {ChunkInMceData} from '@/MceData/MceDataInterface';
import {CtDataStatus} from '@/ReactAPM/Pages/MceComposer/MceComposer';

vi.mock('@/ReactAPM/Components/EntityLink', () => ({
  default: ({label}: {label: string}) => <span>{label}</span>
}));

vi.mock('@/ReactAPM/Components/MultiToggle/MultiToggle', () => ({
  default: () => <div>Break toggle</div>
}));

vi.mock('@/ReactAPM/Components/ConfirmDialog', () => ({
  default: ({show, body, onAccept, onCancel}: {show: boolean; body: React.ReactNode; onAccept: () => void; onCancel?: () => void}) => {
    if (!show) {
      return null;
    }
    return <div>
      <div>{body}</div>
      <button type="button" className="accept-btn" onClick={onAccept}>Accept</button>
      <button type="button" className="cancel-btn" onClick={onCancel}>Cancel</button>
    </div>;
  }
}));

vi.mock('react-bootstrap-icons', () => {
  const IconButton = ({title, onClick, className}: {title?: string; onClick?: () => void; className?: string}) => {
    return <button type="button" title={title} onClick={onClick} className={className}/>;
  };
  return {
    ArrowClockwise: IconButton,
    ArrowDownShort: IconButton,
    ArrowUpShort: IconButton,
    Trash: IconButton,
  };
});

// @ts-expect-error test-only global binding
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const buildChunk = (): ChunkInMceData => ({
  chunkId: 'C1',
  break: '',
  chunkEditionTableId: 101,
  lineNumbersRestart: false,
  title: 'Chunk 1',
  version: '2026-07-13 00:00:00',
  witnessIndices: []
});

const buildCtDataStatus = (chunk: ChunkInMceData): CtDataStatus => ({
  ctDataId: chunk.chunkEditionTableId,
  chunkInMceData: chunk,
  apiData: {
    timeStamp: '2026-07-13 00:00:00',
    isLatestVersion: true,
  } as any,
  ctDataState: 'loaded',
  errorMsg: ''
});

describe('ChunksPanel', () => {
  it('opens a confirmation dialog before deleting and only deletes on accept', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const chunk = buildChunk();
    const deleteChunk = vi.fn(() => true);

    await act(async () => {
      root.render(
        <ChunksPanel
          chunks={[chunk]}
          chunkOrder={[0]}
          ctDataStatusArray={[buildCtDataStatus(chunk)]}
          deleteChunk={deleteChunk}
        />
      );
    });

    const deleteButton = container.querySelector('[title="Click to remove chunk C1 from the edition"]') as HTMLButtonElement;

    await act(async () => {
      deleteButton.click();
    });

    expect(deleteChunk).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Are you sure you want to remove chunk C1 from the edition?');

    const confirmButton = document.body.querySelector('.accept-btn') as HTMLButtonElement;
    await act(async () => {
      confirmButton.click();
    });

    expect(deleteChunk).toHaveBeenCalledOnce();
    expect(deleteChunk).toHaveBeenCalledWith(0);

    await act(async () => {
      root.unmount();
    });
  });

  it('does not delete when confirmation dialog is canceled', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const chunk = buildChunk();
    const deleteChunk = vi.fn(() => true);

    await act(async () => {
      root.render(
        <ChunksPanel
          chunks={[chunk]}
          chunkOrder={[0]}
          ctDataStatusArray={[buildCtDataStatus(chunk)]}
          deleteChunk={deleteChunk}
        />
      );
    });

    const deleteButton = container.querySelector('[title="Click to remove chunk C1 from the edition"]') as HTMLButtonElement;
    await act(async () => {
      deleteButton.click();
    });

    const cancelButton = document.body.querySelector('.cancel-btn') as HTMLButtonElement;
    await act(async () => {
      cancelButton.click();
    });

    expect(deleteChunk).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
  });
});
