import {StateHistory} from "@/ReactAPM/ToolBox/StateHistory/StateHistory";
import {MceComposerHistoryState} from "@/ReactAPM/Pages/MceComposer/MceComposer";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {CheckCircleFill, Circle, Save} from "react-bootstrap-icons";
import React, {useEffect, useState} from "react";
import {Button} from "react-bootstrap";
import './SessionPanel.css';

interface SessionPanelProps {
  history: StateHistory<MceComposerHistoryState>;
  savedStateSignature: string;
  onGoTo: (index: number) => void;
  onClearHistory: () => void;
  historyVersion: number;
}

interface HistoryTableRow {
  index: number;
  label: string;
  isCurrent: boolean;
  isSaved: boolean;
  isRedo: boolean;
  executionTimestamp?: number;
  signature: string;
}

export default function SessionPanel({history, savedStateSignature, onGoTo, onClearHistory, historyVersion}: SessionPanelProps) {
  const [_refreshTick, setRefreshTick] = useState(0);

  // Re-render when history changes externally
  useEffect(() => {
    setRefreshTick(t => t + 1);
  }, [historyVersion]);

  useEffect(() => {
    const interval = setInterval(() => setRefreshTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const states = history.getHistory();
  const currentIndex = history.getCurrentStateIndex();

  const rows: HistoryTableRow[] = [];

  // States in reverse order (most recent first)
  for (let i = states.length - 1; i >= 0; i--) {
    const state = states[i];
    rows.push({
      index: i,
      label: state.actionDescription,
      isCurrent: i === currentIndex,
      isSaved: state.signature === savedStateSignature,
      isRedo: i > currentIndex,
      executionTimestamp: state.executionTimestamp,
      signature: state.signature
    });
  }

  const columnDefs: NiceTableColumnDef<HistoryTableRow>[] = [
    {
      key: 'status',
      title: '',
      cellContent: (row) => (
        <div style={{display: 'flex', gap: '5px', cursor: 'pointer'}}
             onClick={() => onGoTo(row.index)}>
          {row.isCurrent ? <CheckCircleFill className="text-primary" /> : <Circle className="text-muted" />}
          {row.isSaved && <Save className="text-success" title="Last saved state" />}
        </div>
      )
    },
    {
      key: 'signature',
      title: 'Signature',
      cellContent: (row) => (
        <span className={row.isRedo ? 'text-muted' : ''}
              style={{cursor: 'pointer', fontWeight: row.isCurrent ? 'bold' : 'normal'}}
              onClick={() => onGoTo(row.index)}>
          {row.signature}
        </span>
      )
    },
    {
      key: 'label',
      title: 'Description',
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

  const canClear = history.getCurrentStateSignature() === savedStateSignature && states.length > 1;

  return (
    <div className="history-panel">

      <NiceTable rows={rows} columnDefs={columnDefs} />
      {canClear && (
        <div className="clear-history">
          <Button variant="primary" onClick={onClearHistory}>
            Clear History
          </Button>
        </div>
      )}
    </div>
  );
}