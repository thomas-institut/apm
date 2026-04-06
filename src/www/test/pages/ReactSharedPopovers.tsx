import React, {ReactNode} from 'react';
import {SharedTablePopover} from "@/ReactAPM/Components/SharedTablePopover";
import {createRoot} from "react-dom/client";
import '../../node_modules/bootstrap5/dist/css/bootstrap.min.css'
import {Button, Container, OverlayTrigger, Popover} from "react-bootstrap";


async function getPopoverContent(x: number, y: number): Promise<ReactNode> {
  return <><strong>Cell</strong>: {x}, {y}<br/>Important information here.</>;
}

export function ReactSharedPopovers() {

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
          This is a normal popover set up using OverlayTrigger: <OverlayTrigger trigger={["hover", "focus"]} placement="right" overlay={popover}>
          <Button variant="success">Hover me to see</Button>
        </OverlayTrigger>
        </div>
        <SharedTablePopover getPopoverContent={getPopoverContent}>
          <table className="table table-bordered">
            <tbody>
            <tr>
              <td className="cell-0-0" tabIndex={0}>A</td>
              <td className="cell-1-0" tabIndex={0}>B</td>
              <td className="cell-2-0" tabIndex={0}>C</td>
            </tr>
            <tr>
              <td className="cell-0-1" tabIndex={0}>D</td>
              <td className="cell-1-1" tabIndex={0}>E</td>
              <td className="cell-2-1" tabIndex={0}>F</td>
            </tr>
            </tbody>
          </table>
        </SharedTablePopover>
      </Container>
  );
}


const root = createRoot(document.getElementById("app")!);
root.render(<ReactSharedPopovers/>);