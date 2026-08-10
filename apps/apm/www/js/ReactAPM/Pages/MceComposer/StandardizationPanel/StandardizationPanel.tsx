import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import './StandardizationPanel.css';
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import {ArrowCounterclockwise, Check2All, ExclamationTriangleFill, PlusCircle, Trash} from "react-bootstrap-icons";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import {Button} from "react-bootstrap";
import {useMemo, useState} from "react";
import {StandardizedWord} from "@/ReactAPM/Pages/MceComposer/StandardizedWords";
import ConfirmDialog from "@/ReactAPM/Components/ConfirmDialog";


interface StandardizationPanelProps extends TabbableElementProps {
  standardizedWords: StandardizedWord[],
  delete: (original: string) => Promise<true | string>,
  add: (original: string, standardized: string) => Promise<true | string>,
  reset: (original: string) => Promise<true | string>,
  acceptAll: (original: string, mainTextIndices: number[]) => Promise<true | string>
}

type RowPendingAction = 'delete' | 'reset' | 'accept';
interface ConfirmAction {
  original: string;
  action: RowPendingAction;
  mainTextIndices?: number[];
}

export default function StandardizationPanel({
                                               standardizedWords,
                                               delete: deleteWord,
                                               add: addWord,
                                               reset: resetWord,
                                               acceptAll: acceptAllInstances
                                             }: StandardizationPanelProps) {

  const [pendingRowAction, setPendingRowAction] = useState<{ original: string, action: RowPendingAction } | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addOriginal, setAddOriginal] = useState('');
  const [addStandardized, setAddStandardized] = useState('');
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const trimmedAddOriginal = addOriginal.trim();
  const trimmedAddStandardized = addStandardized.trim();
  const originalExists = useMemo(() => standardizedWords.some(word => word.original === trimmedAddOriginal), [standardizedWords, trimmedAddOriginal]);
  const isAddValid = trimmedAddOriginal !== ''
    && trimmedAddStandardized !== ''
    && trimmedAddOriginal !== trimmedAddStandardized
    && !originalExists;

  const isAnyPending = pendingRowAction !== null || addPending;

  const clearRowError = (original: string) => {
    setRowErrors((current) => {
      if (current[original] === undefined) {
        return current;
      }
      const next = {...current};
      delete next[original];
      return next;
    });
  };

  const setRowError = (original: string, error: string) => {
    setRowErrors((current) => ({...current, [original]: error}));
  };

  const handleConfirmDelete = (original: string) => {
    if (isAnyPending) {
      return;
    }
    setConfirmAction({original, action: 'delete'});
  };

  const handleConfirmReset = (original: string) => {
    if (isAnyPending) {
      return;
    }
    setConfirmAction({original, action: 'reset'});
  };

  const handleConfirmAccept = (row: StandardizedWord) => {
    if (isAnyPending || row.instances.length === 0) {
      return;
    }
    setConfirmAction({
      original: row.original,
      action: 'accept',
      mainTextIndices: row.instances.map(instance => instance.mainTextIndex),
    });
  };

  const handleAcceptAllConfirm = async () => {
    if (confirmAction === null) {
      return;
    }
    const {original, action} = confirmAction;
    setConfirmAction(null);
    if (action === 'delete') {
      await handleDelete(original);
    } else if (action === 'reset') {
      await handleReset(original);
    } else {
      await handleAcceptAll(original, confirmAction.mainTextIndices ?? []);
    }
  };

  const handleCancelConfirm = () => {
    setConfirmAction(null);
  };

  const handleDelete = async (original: string) => {
    if (isAnyPending) {
      return;
    }
    setPendingRowAction({original, action: 'delete'});
    clearRowError(original);
    let result: true | string;
    try {
      result = await deleteWord(original);
    } catch (error) {
      console.error(`Error deleting standardized string '${original}'`, error);
      setRowError(original, 'Error: unexpected error');
      return;
    } finally {
      setPendingRowAction(null);
    }
    if (result === true) {
      clearRowError(original);
      return;
    }
    setRowError(original, `Error: ${result}`);
  };

  const handleReset = async (original: string) => {
    if (isAnyPending) {
      return;
    }
    setPendingRowAction({original, action: 'reset'});
    clearRowError(original);
    let result: true | string;
    try {
      result = await resetWord(original);
    } catch (error) {
      console.error(`Error resetting standardized string '${original}'`, error);
      setRowError(original, 'Error: unexpected error');
      return;
    } finally {
      setPendingRowAction(null);
    }
    if (result === true) {
      clearRowError(original);
      return;
    }
    setRowError(original, `Error: ${result}`);
  };

  const handleAcceptAll = async (original: string, mainTextIndices: number[]) => {
    if (isAnyPending) {
      return;
    }
    setPendingRowAction({original, action: 'accept'});
    clearRowError(original);
    let result: true | string;
    try {
      result = await acceptAllInstances(original, mainTextIndices);
    } catch (error) {
      console.error(`Error accepting all instances of standardized string '${original}'`, error);
      setRowError(original, 'Error: unexpected error');
      return;
    } finally {
      setPendingRowAction(null);
    }
    if (result === true) {
      clearRowError(original);
      return;
    }
    setRowError(original, `Error: ${result}`);
  };

  const handleAdd = async () => {
    if (!isAddValid || isAnyPending) {
      return;
    }
    setAddPending(true);
    setAddError(null);
    let result: true | string;
    try {
      result = await addWord(trimmedAddOriginal, trimmedAddStandardized);
    } catch (error) {
      console.error(`Error adding standardized string '${trimmedAddOriginal}'`, error);
      setAddError('Error: unexpected error');
      return;
    } finally {
      setAddPending(false);
    }

    if (result === true) {
      setAddOriginal('');
      setAddStandardized('');
      setAddError(null);
      return;
    }
    setAddError(`Error: ${result}`);
  };

  const rows = standardizedWords.map((w) => {
    const accepted = w.instances.filter(instance => instance.status === 'accepted').length;
    const rejected = w.instances.filter(instance => instance.status === 'rejected').length;
    const standardizedWordInfo: StandardizedWord = {
      ...w,
      accepted,
      rejected,
      notReviewed: w.numInstances - accepted - rejected,
    };
    return standardizedWordInfo;
  });

  const columnDefs: NiceTableColumnDef<StandardizedWord>[] = [
    {
      key: 'original',
      title: 'Original',
      cellContent: (row) => <>{row.original}</>,
    },
    {
      key: 'standardized',
      title: 'Standard',
      cellContent: (row) => <>{row.standardized}</>,
    },
    {
      key: 'numInstances',
      title: 'Total Found',
      tdClassName: 'num',
      thClassName: 'num',
      cellContent: (row) => <>{row.numInstances}</>,
    },
    {
      key: 'accepted',
      title: 'Accepted',
      tdClassName: 'num accepted',
      thClassName: 'num',
      cellContent: (row) => <>{row.accepted}</>,
    },
    {
      key: 'rejected',
      title: 'Rejected',
      tdClassName: 'num rejected',
      thClassName: 'num',
      cellContent: (row) => <>{row.rejected}</>,
    },
    {
      key: 'notReviewed',
      title: 'To Review',
      tdClassName: 'num not-reviewed',
      thClassName: 'num',
      cellContent: (row) => <>{row.notReviewed}</>,
    },
    {
      key: 'controls',
      title: '',
      cellContent: (row) => {
        const deletePending = pendingRowAction?.original === row.original && pendingRowAction.action === 'delete';
        const resetPending = pendingRowAction?.original === row.original && pendingRowAction.action === 'reset';
        const acceptPending = pendingRowAction?.original === row.original && pendingRowAction.action === 'accept';
        const isResetDisabled = isAnyPending || (row.accepted === 0 && row.rejected === 0);
        const isAcceptDisabled = isAnyPending || row.instances.length === 0 ||
          row.instances.every(instance => instance.status === 'accepted');

        return <div className={'standardization-controls'}>
          <div className={'standardization-controls-buttons'}>
            <ComponentWithPending pending={deletePending} pendingTitle={`Deleting '${row.original}'`}>
              <Trash className={'icon-btn' + (isAnyPending ? ' disabled' : '')}
                     title={isAnyPending ? '' : `Click to delete standardized string '${row.original}'`}
                     onClick={() => handleConfirmDelete(row.original)}/>
            </ComponentWithPending>
            <ComponentWithPending pending={acceptPending} pendingTitle={`Accepting all instances of '${row.original}'`}>
              <Check2All className={'icon-btn' + (isAcceptDisabled ? ' disabled' : '')}
                         title={isAcceptDisabled ? '' : `Accept all instances of '${row.original}'`}
                         onClick={() => {
                           if (!isAcceptDisabled) {
                             handleConfirmAccept(row);
                           }
                         }}/>
            </ComponentWithPending>
            <ComponentWithPending pending={resetPending} pendingTitle={`Resetting '${row.original}'`}>
              <ArrowCounterclockwise className={'icon-btn' + (isResetDisabled ? ' disabled' : '')}
                                     title={isResetDisabled ? '' : `Click to reset accepted/rejected instances for '${row.original}'`}
                                     onClick={() => {
                                       if (!isResetDisabled) {
                                         handleConfirmReset(row.original);
                                       }
                                     }}/>
            </ComponentWithPending>
          </div>
          {row.staleInstanceIndices.length > 0 && <ExclamationTriangleFill className={'text-warning'}
                                                                           title={`${row.staleInstanceIndices.length} stale entries, no need to worry for now`}/>}
          {rowErrors[row.original] !== undefined &&
            <span className={'text-danger standardization-row-error'}>{rowErrors[row.original]}</span>}
        </div>;
      }
    }
  ];

  const addValidationMessage = () => {
    if (trimmedAddOriginal === '' || trimmedAddStandardized === '') {
      return null;
    }
    if (trimmedAddOriginal === trimmedAddStandardized) {
      return 'Original and standard must be different';
    }
    if (originalExists) {
      return `Original '${trimmedAddOriginal}' already exists`;
    }
    return null;
  };

  return <div className="standardization-panel">
    <ConfirmDialog
      show={confirmAction !== null}
      onHide={handleCancelConfirm}
      onCancel={handleCancelConfirm}
      onAccept={handleAcceptAllConfirm}
      title={confirmAction?.action === 'delete' ? 'Delete standardization?' :
        confirmAction?.action === 'reset' ? 'Reset standardization?' : 'Accept all instances?'}
      body={confirmAction === null ? null : (confirmAction.action === 'delete' ?
          <>Are you sure you want to delete the standardization entry for <b>{confirmAction.original}</b>?</> :
          confirmAction.action === 'reset' ?
            <>Are you sure you want to reset the standardization status for all instances
              of <b>{confirmAction.original}</b>?</> :
            <>Do you want to accept all {confirmAction.mainTextIndices?.length ?? 0} instances of the string {confirmAction.original}?</>
      )}
      acceptButtonLabel={confirmAction?.action === 'delete' ? 'Delete' : confirmAction?.action === 'reset' ? 'Reset' : 'Yes'}
      cancelButtonLabel={'Cancel'}
      size={'sm'}
    />
    <h1>Standardized Words</h1>
    <p>Add words that you want to standardize. Use the Edition Text panel to accept or reject specific occurrences</p>

    {rows.length > 0 && <div className={'standardization-table-container'}>
      <NiceTable rows={rows} columnDefs={columnDefs} stickyHeader={true} getRowKey={(row) => row.original}/></div>}
    {rows.length === 0 && <p><i>No standardized words defined yet...</i></p>}
    <div className={'standardization-add-section'}>
      <div className={'standardization-add-header'}>
        <PlusCircle className={'icon-btn' + (isAnyPending ? ' disabled' : '')}
                    title={isAnyPending ? '' : 'Add new standardized string'}
                    onClick={() => {
                      if (isAnyPending) {
                        return;
                      }
                      setAddError(null);
                      setShowAddForm(current => !current);
                    }}/>
        <span>Add New</span>
      </div>
      {showAddForm && <ComponentWithPending pending={addPending} pendingTitle={'Adding standardized string'}>
        <div className={'standardization-add-form'}>
          <label>
            Original
            <input type={'text'} value={addOriginal} onChange={(e) => {
              setAddOriginal(e.target.value);
              setAddError(null);
            }}/>
          </label>
          <label>
            Standard
            <input type={'text'} value={addStandardized} onChange={(e) => {
              setAddStandardized(e.target.value);
              setAddError(null);
            }}/>
          </label>
          <Button variant={'primary'} size={'sm'} disabled={!isAddValid || isAnyPending}
                  onClick={handleAdd}>Add</Button>
          {addError !== null && <span className={'text-danger standardization-add-error'}>{addError}</span>}
          {addError === null && addValidationMessage() !== null &&
            <span className={'text-danger standardization-add-error'}>{addValidationMessage()}</span>}
        </div>
      </ComponentWithPending>}
    </div>
  </div>;
};