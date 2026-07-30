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
  chunkId: chunk.chunkId,
  requestedVersion: chunk.version,
  loadedVersionTimeStamp: '2026-07-13 00:00:00',
  isLatestVersion: true,
  ctDataState: 'loaded',
  errorMsg: '',
  lastVersionTimeStamp: null
});

describe('ChunksPanel', () => {
  it('opens a confirmation dialog before deleting and only deletes on accept', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const chunk = buildChunk();
    const deleteChunk = vi.fn().mockResolvedValue(true);

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
    const deleteChunk = vi.fn().mockResolvedValue(true);

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

  it('renders chunks even when ctDataStatusArray has extra entries', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);

    const chunk = buildChunk();
    const extraStatus: CtDataStatus = {
      ...buildCtDataStatus(chunk),
      ctDataId: 999,
      chunkId: 'C999',
    };

    await act(async () => {
      root.render(
        <ChunksPanel
          chunks={[chunk]}
          chunkOrder={[0]}
          ctDataStatusArray={[buildCtDataStatus(chunk), extraStatus]}
        />
      );
    });

    expect(container.textContent).toContain('C1');
    expect(container.textContent).not.toContain('Chunks and CtDataStatusArray length mismatch!');

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
    chunk2Status.isLatestVersion = false;
    const moveChunk = vi.fn().mockResolvedValue(true);
    const updateChunk = vi.fn().mockResolvedValue(true);

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
      vi.advanceTimersByTime(0);
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
    const updateButton = container.querySelector('[title*="Click to update chunk C2"]') as HTMLButtonElement;
    await act(async () => {
      updateButton.click();
      vi.advanceTimersByTime(0);
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
      vi.advanceTimersByTime(0);
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
      vi.advanceTimersByTime(0);
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
    const moveChunk = vi.fn().mockResolvedValue(true);

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
      vi.advanceTimersByTime(0);
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
    vi.useFakeTimers();

    const chunk1 = buildChunk();
    const chunk2 = {...buildChunk(), chunkId: 'C2', chunkEditionTableId: 102};
    const moveChunk = vi.fn().mockResolvedValue(false);

    const flushMoveHandler = async () => {
      for (let i = 0; i < 20; i++) {
        if (container.querySelector('[title="Moving chunk C1"]') === null) {
          break;
        }
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1);
        });
      }
    };

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

    const moveDownButtonTitle = '[title="Click to move chunk C1 one row down"]';
    const getMoveDownButton = () => container.querySelector(moveDownButtonTitle) as HTMLButtonElement;

    await act(async () => {
      getMoveDownButton().click();
    });
    await flushMoveHandler();

    expect(moveChunk).toHaveBeenCalledTimes(1);
    expect(moveChunk).toHaveBeenCalledWith(0, 'down');
    expect(container.querySelector('.highlighted')).toBeNull();

    // The button was unmounted during pending state, so we must find it again
    const moveDownButton2 = getMoveDownButton();
    expect(moveDownButton2).not.toBeNull();

    await act(async () => {
      moveDownButton2.click();
    });
    await flushMoveHandler();

    expect(moveChunk).toHaveBeenCalledTimes(2);
    expect(container.querySelector('.highlighted')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('clears pending move state when moveChunk throws', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    vi.useFakeTimers();

    const chunk1 = buildChunk();
    const chunk2 = {...buildChunk(), chunkId: 'C2', chunkEditionTableId: 102};
    const moveChunk = vi.fn().mockRejectedValue(new Error('Move failed'));

    const flushMoveHandler = async () => {
      for (let i = 0; i < 20; i++) {
        if (container.querySelector('[title="Moving chunk C1"]') === null) {
          break;
        }
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1);
        });
      }
    };

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

    const moveDownButtonTitle = '[title="Click to move chunk C1 one row down"]';
    const getMoveDownButton = () => container.querySelector(moveDownButtonTitle) as HTMLButtonElement;

    await act(async () => {
      getMoveDownButton().click();
      await vi.advanceTimersByTimeAsync(0);
    });
    await flushMoveHandler();

    expect(moveChunk).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.highlighted')).toBeNull();

    const moveDownButton2 = getMoveDownButton();
    expect(moveDownButton2).not.toBeNull();

    await act(async () => {
      moveDownButton2.click();
      await vi.advanceTimersByTimeAsync(0);
    });
    await flushMoveHandler();

    expect(moveChunk).toHaveBeenCalledTimes(2);
    expect(container.querySelector('.highlighted')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('shows the last full chunk load time as initial last check for updates', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    vi.useFakeTimers();

    const now = new Date('2026-07-23T20:27:00Z');
    const lastFullChunkLoadTime = new Date('2026-07-23T20:25:00Z');
    vi.setSystemTime(now);

    const chunk = buildChunk();

    await act(async () => {
      root.render(
        <ChunksPanel
          chunks={[chunk]}
          chunkOrder={[0]}
          ctDataStatusArray={[buildCtDataStatus(chunk)]}
          lastFullChunkLoadTime={lastFullChunkLoadTime}
        />
      );
    });

    expect(container.textContent).not.toContain('Last check for updates: Never');
    expect(container.textContent).toContain('(2 mins ago)');

    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('updates the "last check for updates" time ago every minute', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    vi.useFakeTimers();

    const chunk = buildChunk();
    const checkForChunkUpdates = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(
        <ChunksPanel
          chunks={[chunk]}
          chunkOrder={[0]}
          ctDataStatusArray={[buildCtDataStatus(chunk)]}
          checkForChunkUpdates={checkForChunkUpdates}
        />
      );
    });

    const checkNowButton = container.querySelector('button.btn-outline-secondary') || container.querySelector('button');
    
    // Set a fixed time for "now"
    const now = new Date('2026-07-23T20:27:00Z');
    vi.setSystemTime(now);

    await act(async () => {
      (checkNowButton as HTMLButtonElement).click();
      await vi.advanceTimersByTimeAsync(0);
    });

    // Wait for the async checkForChunkUpdates and state updates
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // We check for the relative time which is what the useEffect refreshes
    expect(container.textContent).toContain('(<1min ago)');

    // Advance 1 minute
    await act(async () => {
      vi.advanceTimersByTime(60000);
    });

    expect(container.textContent).toContain('(1 min ago)');

    // Advance another minute
    await act(async () => {
      vi.advanceTimersByTime(60000);
    });

    expect(container.textContent).toContain('(2 mins ago)');

    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
  });

  it('shows a check error next to the button and does not set last check time when check fails', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const container = document.getElementById('root')!;
    const root = createRoot(container);
    vi.useFakeTimers();

    const chunk = buildChunk();
    const checkForChunkUpdates = vi.fn().mockResolvedValue('Could not retrieve chunk status: Network Error');

    await act(async () => {
      root.render(
        <ChunksPanel
          chunks={[chunk]}
          chunkOrder={[0]}
          ctDataStatusArray={[buildCtDataStatus(chunk)]}
          checkForChunkUpdates={checkForChunkUpdates}
        />
      );
    });

    const checkNowButton = container.querySelector('button.btn-outline-secondary') || container.querySelector('button');

    await act(async () => {
      (checkNowButton as HTMLButtonElement).click();
      await vi.advanceTimersByTimeAsync(0);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(checkForChunkUpdates).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Last check for updates: Never');
    expect(container.textContent).toContain('Could not retrieve chunk status: Network Error');

    await act(async () => {
      root.unmount();
    });
    vi.useRealTimers();
  });
});
