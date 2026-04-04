import '../../node_modules/bootstrap/dist/css/bootstrap.css';
import './splitPanelsTest.css';
import SplitPanels from "@/ReactAPM/Components/PanelUI/SplitPanels";
import {createRoot} from "react-dom/client";
import {useState} from "react";
import PanelWithToolbar from "@/ReactAPM/Components/PanelUI/PanelWithToolbar";

import {LoremIpsum} from "lorem-ipsum";
import {Tabs, Tab} from "react-bootstrap";

const lorem = new LoremIpsum();
lorem.format = 'html';

const someLoremContent = lorem.generateParagraphs(10);

interface MyNicePanelProps {
  title: string;
  buttons?: string[],
  showToolbar?: boolean;
}
function MyNicePanel(props: MyNicePanelProps) {
  const { title, buttons, showToolbar } = props;
  const toolBar = (<>
    { (buttons ?? []).map((b,i) => <button key={i} className="btn">{b}</button>)}
  </>);
  return (<PanelWithToolbar
    showToolBar={showToolbar ?? true}
    toolbar={toolBar} toolbarClassName="toolBar" contentClassName='panelWithToolBarContent'>
    <p>This is a nice panel called {title}</p>
    <div dangerouslySetInnerHTML={{__html: someLoremContent }}/>
  </PanelWithToolbar>);
}

export function SplitPanelsTest() {

  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('vertical');
  const [key, setKey] = useState('home');

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

  const firstPanel = <MyNicePanel title="First Panel" buttons={['Button 1', 'Button 2']} />;
  const secondPanel =   <Tabs
    id="controlled-tab-example"
    activeKey={key}
    onSelect={(k) => setKey(k ?? 'home')}
    className= {"flex-grow-1 d-flex flex-row"}
  >
    <Tab eventKey="home" title="Home" className="h-100">
      <MyNicePanel title="Home" buttons={['H1', 'H2']} />
    </Tab>
    <Tab eventKey="profile" title="Profile" className="h-100" >
      <MyNicePanel title="Profile"  buttons={['P1', 'P2']} />
    </Tab>
    <Tab eventKey="contact" title="Contact" disabled>
      Tab content for Contact
    </Tab>
  </Tabs>
;

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