import {ActionHistory} from "@/toolbox/ActionHistory";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {CheckCircleFill, Circle, Save} from "react-bootstrap-icons";
import React, {useEffect, useState} from "react";

interface HistoryPanelProps {
  history: ActionHistory;
  onGoTo: (index: number) => void;
}

interface HistoryTableRow {
  index: number;
  label: string;
  isCurrent: boolean;
  isSaved: boolean;
  isRedo: boolean;
  executionTimestamp?: number;
}

export default function HistoryPanel({history, onGoTo}: HistoryPanelProps) {
  const [_refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setRefreshTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const undoStack = history.getUndoStack();
  const redoStack = history.getRedoStack();
  const lastSavedIndex = history.getLastSavedIndex();

  const rows: HistoryTableRow[] = [];
  const currentUndoLength = undoStack.length;

  // Redo stack first
  for (let i =0; i  < redoStack.length; i++) {
    const action = redoStack[i];
    rows.push({
      index: currentUndoLength + i,
      label: action.label,
      isCurrent: false,
      isSaved: currentUndoLength + i + 1 === lastSavedIndex,
      isRedo: true,
      executionTimestamp: action.executionTimestamp
    });
  }

  // Add undo stack in reverse order (most recent action at top)
  for (let i = undoStack.length - 1; i >= 0; i--) {
    const action = undoStack[i];
    rows.push({
      index: i,
      label: action.label,
      isCurrent: i === undoStack.length - 1,
      isSaved: i + 1 === lastSavedIndex,
      isRedo: false,
      executionTimestamp: action.executionTimestamp
    });
  }

  // Add initial state at bottom
  rows.push({
    index: -1,
    label: '(Initial State)',
    isCurrent: undoStack.length === 0,
    isSaved: lastSavedIndex === 0,
    isRedo: false
  });

  const columnDefs: NiceTableColumnDef<HistoryTableRow>[] = [
    {
      key: 'status',
      title: '',
      cellContent: (row) => (
        <div style={{display: 'flex', gap: '5px'}}>
          {row.isCurrent ? <CheckCircleFill className="text-primary" /> : <Circle className="text-muted" />}
          {row.isSaved && <Save className="text-success" title="Last saved state" />}
        </div>
      )
    },
    {
      key: 'label',
      title: 'Action',
      cellContent: (row) => (
        <span className={row.isRedo ? 'text-muted' : ''} 
              style={{cursor: 'pointer', fontWeight: row.isCurrent ? 'bold' : 'normal'}}
              onClick={() => onGoTo(row.index)}>
          {row.label}
        </span>
      )
    },
    {
      key: 'time',
      title: 'Time',
      cellContent: (row) => {
        if (row.executionTimestamp === undefined) {
          return <span className="text-muted">—</span>;
        }
        const timestampSeconds = row.executionTimestamp / 1000;
        const formattedTime = ApmFormats.time(timestampSeconds, {withSeconds: true});
        const timeAgo = ApmFormats.timeAgo(timestampSeconds);
        return <span>{formattedTime} ({timeAgo})</span>;
      }
    }
  ];

  return (
    <div className="history-panel">
      <NiceTable rows={rows} columnDefs={columnDefs} />
    </div>
  );
}
