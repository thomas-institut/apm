import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import {useState} from "react";
import {Button} from "react-bootstrap";


interface AddChunksPanelProps extends TabbableElementProps {
  currentChunkTableIds: number[];
  addChunk: (tableId: number, version?: string) => Promise<boolean>;
}


export default function AddChunksPanel({addChunk, currentChunkTableIds}: AddChunksPanelProps) {

  const [addingChunk, setAddingChunk] = useState(false);
  const [tableIdInput, setTableIdInput] = useState<string>('');

  const parsedTableId = parseInt(tableIdInput, 10);
  const isValidTableId = !isNaN(parsedTableId) && parsedTableId > 0;
  const tableIdAlreadyInEdition = isValidTableId && currentChunkTableIds.includes(parsedTableId);
  const isAddDisabled = addingChunk || !isValidTableId || tableIdAlreadyInEdition;

  const onClickAddButton = () => {
    if (isAddDisabled) {
      return;
    }

    setAddingChunk(true);
    void addChunk(parsedTableId, "").finally(() => {
      setAddingChunk(false);
    });
  };

  return (
    <div>
      <h3>Quick Add</h3>

      <ComponentWithPending pending={addingChunk}>
        <div>
          Table Id: <input
            value={tableIdInput}
            type="number"
            placeholder="Table ID"
            onChange={(e) => setTableIdInput(e.target.value)}
          />
          <Button variant={'primary'} size="sm" disabled={isAddDisabled} onClick={onClickAddButton}>Add</Button>
        </div>

      </ComponentWithPending>


    </div>
  );
}
