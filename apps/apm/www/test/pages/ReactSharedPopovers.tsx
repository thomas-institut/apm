import React, {ReactNode} from 'react';
import {SharedTablePopover} from "@/ReactAPM/Components/SharedTablePopover";
import {createRoot} from "react-dom/client";
import '../../node_modules/bootstrap5/dist/css/bootstrap.min.css'
import {Button, Container, OverlayTrigger, Popover} from "react-bootstrap";




function getTable(numRows: number, numCols: number) {
  return (<div style={{display: 'grid', gridTemplateColumns: `repeat(${numCols}, max-content)`}}>
    {
      Array.from({length: numRows}, (_, i) => Array.from({length: numCols}, (_, j) =>
        <div key={`${i}-${j}`} className={`cell cell-${i}-${j}`} style={{border: '1px solid black', padding: '10px'}}>
          Cell {`${i},${j}`}
        </div>))
    }
  </div>)
}

export function ReactSharedPopovers() {

  const [enabledByFunction, setEnabledByFunction] = React.useState(true);
  const [enabledByState, setEnabledByState] = React.useState(true);
  async function getPopoverContent(x: number, y: number): Promise<ReactNode> {
    if (!enabledByFunction) {
      return null;
    }
    return <><strong>Cell</strong>: {x}, {y}<br/>Important information here.</>;
  }

  const popover = (
    <Popover id="popover-basic">
      <Popover.Header as="h3">Popover right</Popover.Header>
      <Popover.Body>
        And here's some <strong>amazing</strong> content. It's very engaging.
        right?
      </Popover.Body>
    </Popover>
  );

  return (
      <Container>
        <h1>React Shared Popovers Example</h1>
        <div style={{marginBottom: '2em', marginTop: '2em'}}>
          This is a normal popover set up using OverlayTrigger: <OverlayTrigger trigger={["hover", "focus"]} placement="auto-end" overlay={popover}>
          <Button variant="success">Hover me to see</Button>
        </OverlayTrigger>
        </div>
        <div>
          This is a shared popover set up using SharedTablePopover.  Set enable state:
          <div>By function:
            <Button variant="primary" onClick={() => setEnabledByFunction(!enabledByFunction)}>{ enabledByFunction ? 'Disable' : 'Enable'}</Button></div>
          <div>
            By state:
            <Button variant="primary" onClick={() => setEnabledByState(!enabledByState)}>{ enabledByState ? 'Disable' : 'Enable'}</Button>
          </div>

        </div>
        <SharedTablePopover getPopoverContent={getPopoverContent} enabled={enabledByState}>
          {getTable(3, 3)}
        </SharedTablePopover>
      </Container>
  );
}


const root = createRoot(document.getElementById("app")!);
root.render(<ReactSharedPopovers/>);