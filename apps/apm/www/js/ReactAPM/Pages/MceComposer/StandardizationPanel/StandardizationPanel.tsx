import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import './StandardizationPanel.css'
import {StandardizedStringData} from "@/MceData/MceDataInterface";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import {ArrowCounterclockwise, PlusCircle, Trash} from "react-bootstrap-icons";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import {Button} from "react-bootstrap";
import {useMemo, useState} from "react";


export interface StandardizedWord extends StandardizedStringData {
  numInstances: number,
}

interface StandardizationPanelProps extends TabbableElementProps{
  standardizedWords: StandardizedWord[],
  delete: (original: string) => Promise<true|string>,
  add: (original: string, standardized: string) => Promise<true|string>,
  reset: (original: string) => Promise<true|string>
}

type RowPendingAction = 'delete' | 'reset';

export default function StandardizationPanel({standardizedWords, delete: deleteWord, add: addWord, reset: resetWord}: StandardizationPanelProps) {

  const [pendingRowAction, setPendingRowAction] = useState<{ original: string, action: RowPendingAction } | null>(null);
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
      title: 'Num Instances',
      tdClassName: 'num',
      thClassName: 'num',
      cellContent: (row) => <>{row.numInstances}</>,
    },
    {
      key: 'accepted',
      title: 'Accepted',
      tdClassName: 'num',
      thClassName: 'num',
      cellContent: (row) => <>{row.instances.filter(instance => instance.status === 'accepted').length}</>,
    },
    {
      key: 'rejected',
      title: 'Rejected',
      tdClassName: 'num',
      thClassName: 'num',
      cellContent: (row) => <>{row.instances.filter(instance => instance.status === 'rejected').length}</>,
    },
    {
      key: 'controls',
      title: 'Controls',
      cellContent: (row) => {
        const deletePending = pendingRowAction?.original === row.original && pendingRowAction.action === 'delete';
        const resetPending = pendingRowAction?.original === row.original && pendingRowAction.action === 'reset';

        return <div className={'standardization-controls'}>
          <div className={'standardization-controls-buttons'}>
            <ComponentWithPending pending={deletePending} pendingTitle={`Deleting '${row.original}'`}>
              <Trash className={'icon-btn' + (isAnyPending ? ' disabled' : '')}
                     title={isAnyPending ? '' : `Click to delete standardized string '${row.original}'`}
                     onClick={() => handleDelete(row.original)}/>
            </ComponentWithPending>
            <ComponentWithPending pending={resetPending} pendingTitle={`Resetting '${row.original}'`}>
              <ArrowCounterclockwise className={'icon-btn' + (isAnyPending ? ' disabled' : '')}
                                     title={isAnyPending ? '' : `Click to reset accepted/rejected instances for '${row.original}'`}
                                     onClick={() => handleReset(row.original)}/>
            </ComponentWithPending>
          </div>
          {rowErrors[row.original] !== undefined && <span className={'text-danger standardization-row-error'}>{rowErrors[row.original]}</span>}
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
    <h1>Standardized Words</h1>
    <p>Add words that you want to standardize. Use the Edition Text panel to accept or reject specific occurrences</p>
    <div className={'standardization-table-container'}>
      <NiceTable rows={standardizedWords} columnDefs={columnDefs} stickyHeader={true} getRowKey={(row) => row.original}/>
    </div>
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
          <Button variant={'primary'} size={'sm'} disabled={!isAddValid || isAnyPending} onClick={handleAdd}>Add</Button>
          {addError !== null && <span className={'text-danger standardization-add-error'}>{addError}</span>}
          {addError === null && addValidationMessage() !== null &&
            <span className={'text-danger standardization-add-error'}>{addValidationMessage()}</span>}
        </div>
      </ComponentWithPending>}
    </div>
    </div>
}