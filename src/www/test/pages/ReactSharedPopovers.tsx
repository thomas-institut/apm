import React from 'react';
import {SharedTablePopover} from "@/ReactAPM/Components/SharedTablePopover";
import {createRoot} from "react-dom/client";
import '../../node_modules/bootstrap/dist/css/bootstrap.min.css'
import {Container} from "react-bootstrap";


async function getPopoverContent(x: number, y: number): Promise<string> {
  await new Promise((resolve) => window.setTimeout(resolve, 150));

  return `<strong>Cell</strong>: ${x}, ${y}<br/>Important information here.`;
}

export function ReactSharedPopovers() {
  return (
      <Container>
        <h1>React Shared Popovers Example</h1>
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