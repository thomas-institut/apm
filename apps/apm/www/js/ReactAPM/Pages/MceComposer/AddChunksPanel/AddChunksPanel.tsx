import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import {useState, useEffect} from "react";
import {Button} from "react-bootstrap";
import './AddChunksPanel.css';


interface AddChunksPanelProps extends TabbableElementProps {
  currentChunkTableIds: number[];
  /**
   * A function to add a chunk to the current chunk list.
   *
   * If the chunk is successfully added, it returns true. If there is a problem, it returns a string describing the problem.
   */
  addChunk: (tableId: number, version?: string) => Promise<true|string>;
}


export default function AddChunksPanel({addChunk, currentChunkTableIds}: AddChunksPanelProps) {

  const [addingChunk, setAddingChunk] = useState(false);
  const [tableIdInput, setTableIdInput] = useState<string>('');
  const [addChunkError, setAddChunkError] = useState<string|null>(null);

  const parsedTableId = parseInt(tableIdInput, 10);
  const isValidTableId = !isNaN(parsedTableId) && parsedTableId > 0;
  const tableIdAlreadyInEdition = isValidTableId && currentChunkTableIds.includes(parsedTableId);
  const isAddDisabled = addingChunk || !isValidTableId || tableIdAlreadyInEdition;

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

  const onClickAddButton = () => {
    if (isAddDisabled) {
      return;
    }
    setAddingChunk(true);
    setAddChunkError(null);
    setTimeout( async () => {
      const result = await addChunk(parsedTableId, "");
      setAddingChunk(false);
      if (result === true) {
        setTableIdInput('');
      } else {
        setAddChunkError(`Error: ${result}`);
      }
    },0)
  };

  return (
    <div className={'add-chunks-panel'}>
      <div className={'section quick-add'}>
        <h1>Quick Add</h1>
        <ComponentWithPending pending={addingChunk}>
          <div className="quick-add-form">
            <div>
              Table Id: <input
              value={tableIdInput}
              type="number"
              placeholder="Enter a table Id"
              onChange={(e) => setTableIdInput(e.target.value)}
            />
            </div>
            <Button variant={'primary'} size="sm" disabled={isAddDisabled} onClick={onClickAddButton}>Add</Button>
            {addChunkError && <span className="text-danger">{addChunkError}</span>}
          </div>
        </ComponentWithPending>
      </div>
    </div>
  );
}
