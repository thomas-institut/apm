import {ActionHistory} from "@/toolbox/ActionHistory";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import {CheckCircleFill, Circle, Save} from "react-bootstrap-icons";
import React from "react";

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
}

export default function HistoryPanel({history, onGoTo}: HistoryPanelProps) {
  const undoStack = history.getUndoStack();
  const redoStack = history.getRedoStack();
  const lastSavedIndex = history.getLastSavedIndex();

  const rows: HistoryTableRow[] = [];

  // Add initial state
  rows.push({
    index: -1,
    label: '(Initial State)',
    isCurrent: undoStack.length === 0,
    isSaved: lastSavedIndex === 0,
    isRedo: false
  });

  // Add undo stack
  undoStack.forEach((action, i) => {
    rows.push({
      index: i,
      label: action.label,
      isCurrent: i === undoStack.length - 1,
      isSaved: i + 1 === lastSavedIndex,
      isRedo: false
    });
  });

  // Add redo stack (in reverse order of how they would be redone)
  const currentUndoLength = undoStack.length;
  redoStack.forEach((action, i) => {
    rows.push({
      index: currentUndoLength + i,
      label: action.label,
      isCurrent: false,
      isSaved: currentUndoLength + i + 1 === lastSavedIndex,
      isRedo: true
    });
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
    }
  ];

  return (
    <div className="history-panel">
      <NiceTable rows={rows} columnDefs={columnDefs} />
    </div>
  );
}
