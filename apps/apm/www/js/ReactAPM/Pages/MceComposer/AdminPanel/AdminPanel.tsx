import './AdminPanel.css';
import {useState} from "react";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {Button} from "react-bootstrap";
import {MceVersionInfo} from "@/Api/DataSchema/ApiMceData";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import {ApmFormats} from "@/pages/common/ApmFormats";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import ConfirmDialog from "@/ReactAPM/Components/ConfirmDialog";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";


interface AdminPanelProps extends TabbableElementProps {
  mceId: number;
  version: string | null;
  versions: MceVersionInfo[];
  cloneEdition: () => Promise<number | string>;
  archive: () => Promise<true | string>;
  isArchived: boolean;
  archivingEnabled: boolean;
}


export default function AdminPanel({mceId, version, versions, cloneEdition, archive, isArchived, archivingEnabled}: AdminPanelProps) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<number | string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<string | null>(null);

  const sortedVersions = [...versions].sort((a, b) => b.timeString.localeCompare(a.timeString));

  const loadedVersionIndex = version === null ? 0 : sortedVersions.findIndex(v => v.timeString === version);

  const getRowClassName = (row: MceVersionInfo, index: number) => index === loadedVersionIndex ? 'loaded-version' : '';

  const handleClone = async () => {
    setCloning(true);
    setCloneResult(null);
    try {
      setCloneResult(await cloneEdition());
    } finally {
      setCloning(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    setArchiveResult(null);
    try {
      const result = await archive();
      if (typeof result === 'string') {
        setArchiveResult(result);
      }
    } finally {
      setArchiving(false);
    }
  };

  const columnDefs: NiceTableColumnDef<MceVersionInfo>[] = [
    {
      key: 'n',
      title: 'N',
      cellContent: (_row, index) => <>{index + 1}</>,
    },
    {
      key: 'time',
      title: 'Time',
      cellContent: (row, index) => index === loadedVersionIndex ? <strong>{ApmFormats.timeString(row.timeString)}</strong> : <EntityLink id={mceId}
                                        type={'multiChunkEdition'} version={index === 0 ? undefined : row.timeString}
                                        name={ApmFormats.timeString(row.timeString)}/>
    },
    {
      key: 'author',
      title: 'Author',
      cellContent: (row) => <EntityLink id={row.authorId} type={'person'}/>,
    },
    {
      key: 'description',
      title: 'Description',
      tdClassName: 'description',
      cellContent: (row) => <>{row.description}</>,
    },
  ];


  return <div className="admin-panel">
    <div className={'archive-div'}>
      <h1>Archive</h1>
      <div className={'archive-info' + (archiveResult !== null ? ' text-danger' : '')}>
        {isArchived && 'This edition is archived'}
        {!isArchived && archiving && 'Archiving edition...'}
        {!isArchived && !archiving && archiveResult !== null && archiveResult}
        {!isArchived && !archiving && archiveResult === null && !archivingEnabled &&
          'There are unsaved changes, archiving is not possible'}
      </div>
      <div className={'action-buttons-div'}>
        <ComponentWithPending pending={archiving} pendingTitle={'Archiving edition'}>
          <Button disabled={isArchived || !archivingEnabled} title={'Archive Edition'} variant={'danger'}
                  onClick={() => setArchiveConfirmationOpen(true)}>Archive Edition</Button>
        </ComponentWithPending>
      </div>
    </div>

    <div className={'clone-div'}>
      <h1>Clone</h1>
      {cloning && <div className={'clone-info'}>Cloning edition...</div>}
      {!cloning && cloneResult === null && <div className={'clone-info'}>No clones made this session</div>}
      {!cloning && typeof cloneResult === 'number' && <div className={'clone-info'}>Edition successfully cloned: <EntityLink
        id={cloneResult} type={'multiChunkEdition'} name={`${cloneResult}`} openInNewTab={true}/></div>}
      {!cloning && typeof cloneResult === 'string' && <div className={'clone-info text-danger'}>{cloneResult}</div>}
      <div className={'action-buttons-div'}>
        <ComponentWithPending pending={cloning} pendingTitle={'Cloning edition'}>
          <Button title={'Clone Edition'} onClick={() => setConfirmationOpen(true)}>Clone Edition</Button>
        </ComponentWithPending>
      </div>
    </div>

    <div className={'versions-div'}>
      <h1>Versions</h1>
      <NiceTable rows={sortedVersions} columnDefs={columnDefs} getRowClassName={getRowClassName} className={'versions-table'}
                 getRowKey={(row) => `${row.mceId}-${row.timeString}`}/>
    </div>
    <ConfirmDialog show={confirmationOpen}
                   onHide={() => setConfirmationOpen(false)}
                   onAccept={handleClone}
                   title={'Clone Edition'}
                   body={'Do you want to clone this edition?'}
                   acceptButtonLabel={'Yes'}
                   cancelButtonLabel={'No'}/>
    <ConfirmDialog show={archiveConfirmationOpen}
                   onHide={() => setArchiveConfirmationOpen(false)}
                   onAccept={handleArchive}
                   title={'Archive Edition'}
                   body={'Do you want to archive this edition?'}
                   acceptButtonLabel={'Yes'}
                   cancelButtonLabel={'No'}/>
  </div>;
}

