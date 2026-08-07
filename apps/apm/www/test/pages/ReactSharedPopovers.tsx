import React, {CSSProperties, ReactNode} from 'react';
import {createRoot} from "react-dom/client";
import {Button, Container, OverlayTrigger, Popover} from "react-bootstrap";
import ClassOverlay from "@/ReactAPM/Components/ClassOverlay/ClassOverlay";
import 'bootstrap/dist/css/bootstrap.min.css';




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

  const overlayStyle: CSSProperties = {
    background: 'lightgray',
    border: '1px solid black',
    padding: '10px',
    borderRadius: '5px'
  }
  async function getPopoverContent(id: string |null ): Promise<ReactNode> {
    if (!enabledByFunction) {
      return null;
    }
    if (id === null) {
      return null;
    }
    const [x, y] = id.split('-');
    return <div style={overlayStyle}><strong>Cell</strong>: {x}, {y}<br/>Important information here.</div>;
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
          <div>By function (i.e., the content generation function enables or disables the popover):
            <Button variant="primary" onClick={() => setEnabledByFunction(!enabledByFunction)}>{ enabledByFunction ? 'Disable' : 'Enable'}</Button></div>
          <div>
            By state (i.e., a state variable enables or disables the popover):
            <Button variant="primary" onClick={() => setEnabledByState(!enabledByState)}>{ enabledByState ? 'Disable' : 'Enable'}</Button>
          </div>

        </div>
        <ClassOverlay getOverlayContent={getPopoverContent} enabled={enabledByState} baseClassName={'cell'} trigger={'hover'} hoverDelay={100} overlayOffset={1}>
          {getTable(3, 3)}
        </ClassOverlay>
      </Container>
  );
}


const root = createRoot(document.getElementById("app")!);
root.render(<ReactSharedPopovers/>);