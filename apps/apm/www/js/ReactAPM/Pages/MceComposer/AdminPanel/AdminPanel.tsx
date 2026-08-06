

import './AdminPanel.css';
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {Button} from "react-bootstrap";
import {MceVersionInfo} from "@/Api/DataSchema/ApiMceData";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import {ApmFormats} from "@/pages/common/ApmFormats";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {useState} from "react";

const VERSION_DESCRIPTION_MAX_LENGTH = 150;

function VersionDescription({description}: {description: string}) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const isTruncated = description.length > VERSION_DESCRIPTION_MAX_LENGTH;
  const displayedDescription = !isTruncated || showFullDescription ? description : description.slice(0, VERSION_DESCRIPTION_MAX_LENGTH);

  return <>
    {displayedDescription}
    {isTruncated && !showFullDescription && <Button variant={'link'} size={'sm'} onClick={() => setShowFullDescription(true)}>
      Show more
    </Button>}
  </>;
}



interface AdminPanelProps extends TabbableElementProps{
  versions: MceVersionInfo[];
}


export default function AdminPanel({versions}: AdminPanelProps){

  const sortedVersions = [...versions].sort((a, b) => b.timeString.localeCompare(a.timeString));
  const columnDefs: NiceTableColumnDef<MceVersionInfo>[] = [
    {
      key: 'n',
      title: 'N',
      cellContent: (_row, index) => <>{index + 1}</>,
    },
    {
      key: 'time',
      title: 'Time',
      cellContent: (row) => <>{ApmFormats.timeString(row.timeString)}</>,
    },
    {
      key: 'author',
      title: 'Author',
      cellContent: (row) => <EntityLink id={row.authorId} type={'person'}/>,
    },
    {
      key: 'description',
      title: 'Description',
      cellContent: (row) => <VersionDescription description={row.description}/>,
    },
  ];


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
    <NiceTable rows={sortedVersions} columnDefs={columnDefs}
               getRowKey={(row) => `${row.mceId}-${row.timeString}`}/>
    </div>
  </div>
}

