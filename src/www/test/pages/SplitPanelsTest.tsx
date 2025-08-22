import '../../node_modules/bootstrap/dist/css/bootstrap.css';
import './splitPanelsTest.css';
import SplitPanels from "@/Components/SplitPanels";
import {createRoot} from "react-dom/client";
import {useState} from "react";
import PanelWithToolbar from "@/Components/PanelWithToolbar";

import {LoremIpsum} from "lorem-ipsum";

const lorem = new LoremIpsum();
lorem.format = 'html';
function MyNicePanel() {
  const toolBar = (<>
    <button className="btn">A</button>
    <button className="btn">B</button>
    <button className="btn">C</button>
  </>);
  return (<PanelWithToolbar
    toolBar={toolBar} toolBarClass="toolBar" panelClass='panelWithToolBarContent'>
    <p>This is a nice panel.</p>
    <div dangerouslySetInnerHTML={{__html: lorem.generateParagraphs(10) }}/>
  </PanelWithToolbar>);
}

function SplitPanelsTest() {

  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('vertical');

  const toggleDirection = () => {
    if (direction === 'horizontal') {
      setDirection('vertical');
    } else {
      setDirection('horizontal');
    }
  };



  const handleResize = (firstRatio: number, secondRatio: number) => {
    console.log("handleResize", firstRatio, secondRatio);
  };

  const firstPanel = <><
    h1>First Panel</h1>
    <div dangerouslySetInnerHTML={{__html: lorem.generateParagraphs(10)}}/>
  </>;
  const secondPanel = <MyNicePanel/>;

  return (<div className="app">
    <div className="header"
         style={{
           paddingLeft: '10px',
           paddingRight: '10px',
           display: 'flex',
           flexDirection: 'row',
           justifyContent: 'space-between',
           alignItems: 'center'
         }}>
      <h1>Split Panels Test</h1>
      <button className="btn btn-primary" onClick={toggleDirection}>Toggle Direction</button>
    </div>
    <SplitPanels
      direction={direction}
      containerClass="panelContainer"
      dividerClass="divider"
      firstPanel={firstPanel}
      firstPanelClass="panel simplePanel"
      secondPanel={secondPanel}
      secondPanelClass="panel nicePanel"
      onResize={handleResize}
    />
  </div>);
}


const root = createRoot(document.getElementById("app")!);

root.render(<SplitPanelsTest/>);