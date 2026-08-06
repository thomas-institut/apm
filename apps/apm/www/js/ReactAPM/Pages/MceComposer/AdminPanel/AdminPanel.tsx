

import './AdminPanel.css';
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {Button} from "react-bootstrap";
import {MceVersionInfo} from "@/Api/DataSchema/ApiMceData";



interface AdminPanelProps extends TabbableElementProps{
  versions: MceVersionInfo[];
}


export default function AdminPanel({versions}: AdminPanelProps){



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
    <ol>
      {versions.map((version) => <li>{version.timeString} by {version.authorId}</li>)}
    </ol>
    </div>
  </div>
}

