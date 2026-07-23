/**
 * @vitest-environment happy-dom
 */

import React from 'react';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, expect, it, vi} from 'vitest';
import ChunksPanel from '@/ReactAPM/Pages/MceComposer/ChunksPanel/ChunksPanel';
import {ChunkInMceData} from '@/MceData/MceDataInterface';
import {CtDataStatus} from '@/ReactAPM/Pages/MceComposer/MceComposer';

vi.mock('@/ReactAPM/Components/EntityLink', () => ({
  default: ({label}: {label: string}) => <span>{label}</span>
}));

vi.mock('@/ReactAPM/Components/MultiToggle/MultiToggle', () => ({
  default: ({onChange}: {onChange: (val: string) => void}) => <button type="button" className="break-toggle" onClick={() => onChange('page')}>Break toggle</button>
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

  it('highlights a moved chunk once when panel is active and clears highlight on other actions', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    vi.useFakeTimers();

    const chunk1 = buildChunk();
    const chunk2 = {...buildChunk(), chunkId: 'C2', chunkEditionTableId: 102};
    const chunk2Status = buildCtDataStatus(chunk2);
    // @ts-expect-error test-only property override
    chunk2Status.apiData.isLatestVersion = false;
    const moveChunk = vi.fn(() => true);
    const updateChunk = vi.fn(() => true);

    const render = (order: number[], active = true) => act(async () => {
      root.render(
        <ChunksPanel
          chunks={[chunk1, chunk2]}
          chunkOrder={order}
          ctDataStatusArray={[buildCtDataStatus(chunk1), chunk2Status]}
          moveChunk={moveChunk}
          updateChunk={updateChunk}
          active={active}
        />
      );
    });

    await render([0, 1]);

    const moveDownButton = container.querySelector('[title="Click to move chunk C1 one row down"]') as HTMLButtonElement;

    // 1. Move chunk C1 down
    await act(async () => {
      moveDownButton.click();
    });

    expect(moveChunk).toHaveBeenCalledWith(0, 'down');

    // Check if row 1 (index 0) is highlighted
    let rows = container.querySelectorAll('tr');
    expect(rows[1].className).toContain('highlighted'); // rows[0] is header

    // 2. Simulate move completion by updating props
    await render([1, 0]);

    // Now C1 should be at index 1 (second row)
    rows = container.querySelectorAll('tr');
    expect(rows[2].className).toContain('highlighted');
    expect(rows[1].className).not.toContain('highlighted');

    // Highlight expires after animation time and should not replay on tab switch.
    await act(async () => {
      vi.advanceTimersByTime(1700);
    });
    expect(container.querySelector('.highlighted')).toBeNull();

    await render([1, 0], false);
    await render([1, 0], true);
    expect(container.querySelector('.highlighted')).toBeNull();

    // 3. Perform another action (Update)
    const updateButton = container.querySelector('[title="Click to update chunk C2"]') as HTMLButtonElement;
    await act(async () => {
      updateButton.click();
    });

    expect(updateChunk).toHaveBeenCalled();

    // Trigger reset of pending state
    await render([1, 0]);

    // Highlight should be cleared
    expect(container.querySelector('.highlighted')).toBeNull();

    // 4. Move again (it's at index 1 now, so move it up)
    const moveUpButton = container.querySelector('[title="Click to move chunk C1 one row up"]') as HTMLButtonElement;
    expect(moveUpButton).not.toBeNull();
    await act(async () => {
      moveUpButton.click();
    });
    expect(container.querySelector('.highlighted')).not.toBeNull();

    // 5. Cancel highlight by changing break
    const breakToggle = container.querySelector('.break-toggle') as HTMLButtonElement;
    await act(async () => {
      breakToggle.click();
    });
    expect(container.querySelector('.highlighted')).toBeNull();

    // Trigger reset of pending state
    await render([1, 0]);

    // 6. Move again
    const moveDownButton2 = container.querySelector('[title="Click to move chunk C2 one row down"]') as HTMLButtonElement;
    await act(async () => {
      moveDownButton2.click();
    });
    expect(container.querySelector('.highlighted')).not.toBeNull();

    // Clear move pending state
    await render([1, 0]);

    // 7. Click delete
    const deleteBtn = container.querySelector('[title="Click to remove chunk C1 from the edition"]') as HTMLButtonElement;
    expect(deleteBtn).not.toBeNull();
    await act(async () => {
      deleteBtn.click();
    });
    expect(container.querySelector('.highlighted')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('defers moved-row highlight while inactive and consumes it once when active', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    vi.useFakeTimers();

    const chunk1 = buildChunk();
    const chunk2 = {...buildChunk(), chunkId: 'C2', chunkEditionTableId: 102};
    const moveChunk = vi.fn(() => true);

    const render = (order: number[], active: boolean) => act(async () => {
      root.render(
        <ChunksPanel
          chunks={[chunk1, chunk2]}
          chunkOrder={order}
          ctDataStatusArray={[buildCtDataStatus(chunk1), buildCtDataStatus(chunk2)]}
          moveChunk={moveChunk}
          active={active}
        />
      );
    });

    await render([0, 1], false);

    const moveDownButton = container.querySelector('[title="Click to move chunk C1 one row down"]') as HTMLButtonElement;
    await act(async () => {
      moveDownButton.click();
    });

    expect(moveChunk).toHaveBeenCalledWith(0, 'down');
    expect(container.querySelector('.highlighted')).toBeNull();

    await render([1, 0], true);

    let rows = container.querySelectorAll('tr');
    expect(rows[2].className).toContain('highlighted');
    expect(rows[1].className).not.toContain('highlighted');

    await act(async () => {
      vi.advanceTimersByTime(1700);
    });
    expect(container.querySelector('.highlighted')).toBeNull();

    await render([1, 0], false);
    await render([1, 0], true);
    expect(container.querySelector('.highlighted')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('does not highlight and clears pending move when moveChunk fails', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const chunk1 = buildChunk();
    const chunk2 = {...buildChunk(), chunkId: 'C2', chunkEditionTableId: 102};
    const moveChunk = vi.fn(() => false);

    await act(async () => {
      root.render(
        <ChunksPanel
          chunks={[chunk1, chunk2]}
          chunkOrder={[0, 1]}
          ctDataStatusArray={[buildCtDataStatus(chunk1), buildCtDataStatus(chunk2)]}
          moveChunk={moveChunk}
        />
      );
    });

    const moveDownButton = container.querySelector('[title="Click to move chunk C1 one row down"]') as HTMLButtonElement;

    await act(async () => {
      moveDownButton.click();
    });

    expect(moveChunk).toHaveBeenCalledTimes(1);
    expect(moveChunk).toHaveBeenCalledWith(0, 'down');
    expect(container.querySelector('.highlighted')).toBeNull();

    await act(async () => {
      moveDownButton.click();
    });

    expect(moveChunk).toHaveBeenCalledTimes(2);
    expect(container.querySelector('.highlighted')).toBeNull();

    await act(async () => {
      root.unmount();
    });
  });
});
