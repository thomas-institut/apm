

import './AdminPanel.css';
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {Button} from "react-bootstrap";



interface AdminPanelProps extends TabbableElementProps{

}


export default function AdminPanel(props: AdminPanelProps){

  return <div className="admin-panel">
    <div className={'control-div'}>
      <h1>Actions</h1>
      <div className={'action-buttons-div'}>
        <Button disabled={true} title={'Archiving editions not implemented yet'}>Archive Edition</Button>
        <Button disabled={true} title={'Cloning editions not implemented yet'}>Clone Edition</Button>
      </div>

    </div>

    <div className={'versions-div'}>
    <h1>Versions</h1>
    <p>Versions will be here...</p>
    </div>
  </div>
}

