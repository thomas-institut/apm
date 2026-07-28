import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import {useEffect, useMemo, useState} from "react";
import {Button, Spinner} from "react-bootstrap";
import './AddChunksPanel.css';
import {nextTick} from "@/ReactAPM/ToolBox/NextTick";
import {ApiCollationTableInfo} from "@/Api/DataSchema/ApiCollationTable";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";


interface AddChunksPanelProps extends TabbableElementProps {
  currentChunkTableIds: number[];
  /**
   * A function to add a chunk to the current chunk list.
   *
   * If the chunk is successfully added, it returns true. If there is a problem, it returns a string describing the problem.
   */
  addChunk: (tableId: number, version?: string) => Promise<true | string>;

  /**
   * A function to fetch the list of active editions.
   *
   * It is up to the parent component to decide which editions to fetch, e.g. all or just some selected ones.
   *
   */
  getActiveEditions: () => Promise<ApiCollationTableInfo[] | string>;
}


export default function AddChunksPanel({addChunk, currentChunkTableIds, getActiveEditions}: AddChunksPanelProps) {

  const [addingTableId, setAddingTableId] = useState<number | null>(null);
  const [tableIdInput, setTableIdInput] = useState<string>('');
  const [addChunkError, setAddChunkError] = useState<string | null>(null);
  const [editionArray, setEditionArray] = useState<ApiCollationTableInfo[] | null>(null);
  const [fetchingEditions, setFetchingEditions] = useState(false);
  const [fetchEditionsError, setFetchEditionsError] = useState<string | null>(null);

  const parsedTableId = parseInt(tableIdInput, 10);
  const isValidTableId = !isNaN(parsedTableId) && parsedTableId > 0;
  const tableIdAlreadyInEdition = isValidTableId && currentChunkTableIds.includes(parsedTableId);
  const isQuickAddButtonDisabled = addingTableId !== null || !isValidTableId || tableIdAlreadyInEdition;

  useEffect(() => {
    if (tableIdInput === '') {
      setAddChunkError(null);
      return;
    }
    if (!isValidTableId) {
      setAddChunkError(`'${tableIdInput}' is not a valid table Id`);
      return;
    }
    if (tableIdAlreadyInEdition) {
      setAddChunkError(`Table ${parsedTableId} already in edition`);
      return;
    }
    setAddChunkError(null);
  }, [tableIdInput, tableIdAlreadyInEdition, isValidTableId]);

  const onClickAddButton = async (tableId: number, quickAdd: boolean = false) => {
    console.log(`Adding table ${tableId}`);
    if (quickAdd && isQuickAddButtonDisabled) {
      console.log('Add button is disabled');
      return;
    }
    if (!quickAdd && addingTableId === tableId) {
      console.log('Table already being added');
      return;
    }
    setAddingTableId(tableId);
    setAddChunkError(null);
    await nextTick();
    const result = await addChunk(tableId, "");
    setAddingTableId(null);
    if (result === true) {
      setTableIdInput('');
    } else {
      setAddChunkError(`Error: ${result}`);
    }
  };

  const sortedRows = useMemo(() => editionArray?.sort((a, b) => {
    const workIdCmp = a.workId.localeCompare(b.workId);
    if (workIdCmp !== 0) {
      return workIdCmp;
    }
    return a.chunkNumber - b.chunkNumber;
  }), [editionArray]);

  const onClickLoadEditions = async () => {
    setFetchingEditions(true);
    setFetchEditionsError(null);
    const result = await getActiveEditions();
    console.log(`Got active editions`, result);
    setFetchingEditions(false);
    if (typeof result === 'string') {
      console.log(`Error: ${result}`);
      setFetchEditionsError(`Error: ${result}`);
      return;
    }
    setEditionArray(result);
  };

  const editionTableDef: NiceTableColumnDef<ApiCollationTableInfo>[] = [
    {
      key: 'n',
      title: '#',
      cellContent: (_row, index) => <>{index + 1}</>,
    },
    {
      key: 'tableId',
      title: 'Table Id',
      cellContent: (row) => <>{row.id}</>,
    },
    {
      key: 'chunkId',
      title: 'Chunk Id',
      cellContent: (row) => <>{row.chunkId}</>,
    },
    {
      key: 'title',
      title: 'Title',
      cellContent: (row) => <>{row.title}</>,
    },
    {
      key: 'controls',
      title: '',
      cellContent: (row) => <>
        {currentChunkTableIds.includes(row.id) && <span className={'text-muted'}>Already added</span>}
        {!currentChunkTableIds.includes(row.id) &&
          <ComponentWithPending pending={addingTableId === row.id}>
            <Button variant={'primary'} size="sm" onClick={() => onClickAddButton(row.id)}> Add</Button>
          </ComponentWithPending>}
      </>
    }
  ];


  return (
    <div className={'add-chunks-panel'}>
      <div className={'section quick-add'}>
        <h1>Quick Add</h1>
        <ComponentWithPending pending={addingTableId === parsedTableId}>
          <div className="quick-add-form">
            <div>
              Table Id: <input
              value={tableIdInput}
              type="number"
              placeholder="Enter a table Id"
              onChange={(e) => setTableIdInput(e.target.value)}
            />
            </div>
            <Button variant={'primary'} size="sm" disabled={isQuickAddButtonDisabled}
                    onClick={() => onClickAddButton(parsedTableId)}>Add</Button>
            {addChunkError && <span className="text-danger">{addChunkError}</span>}
          </div>
        </ComponentWithPending>
      </div>
      <div className={'section editions-table-div' + (editionArray === null ? ' no-data' : '')}>
        <h1>Available Editions</h1>
        {editionArray === null && <div className={'load-editions-div'}>
          <ComponentWithPending pending={fetchingEditions}
                                pendingElement={<span>Loading editions data, this might take a while...<Spinner
                                  size={'sm'}/></span>}>
            <Button variant={'primary'} size="sm" onClick={onClickLoadEditions}>Load Data</Button>
          </ComponentWithPending>
          {fetchEditionsError && <div className="text-danger">{fetchEditionsError}</div>}
        </div>}
        {editionArray !== null &&
          <div className={'editions-table-container'}><NiceTable columnDefs={editionTableDef} rows={sortedRows ?? []}
                                                                 stickyHeader={true}/></div>}
      </div>
    </div>
  );
}
