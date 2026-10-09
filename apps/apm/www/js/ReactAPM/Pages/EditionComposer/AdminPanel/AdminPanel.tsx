import './AdminPanel.css';
import {useState} from "react";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {Button} from "react-bootstrap";
import {CtVersionInfo} from "@/Api/DataSchema/ApiCollationTable";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import {ApmFormats} from "@/pages/common/ApmFormats";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import ConfirmDialog from "@/ReactAPM/Components/ConfirmDialog";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";


interface AdminPanelProps extends TabbableElementProps {
  tableId: number;
  versionTimeStamp: string;
  versions: CtVersionInfo[];
  isLatestVersion: boolean;
  archive: () => Promise<true | string>;
  isArchived: boolean;
  archivingEnabled: boolean;
}


export default function AdminPanel({tableId, versionTimeStamp, versions, isLatestVersion, archive, isArchived, archivingEnabled}: AdminPanelProps) {
  const [archiveConfirmationOpen, setArchiveConfirmationOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<string | null>(null);

  const sortedVersions = [...versions].sort((a, b) => b.timeFrom.localeCompare(a.timeFrom));
  const loadedVersionIndex = isLatestVersion ? 0 : sortedVersions.findIndex(version => version.timeFrom === versionTimeStamp);

  const getRowClassName = (_row: CtVersionInfo, index: number) => index === loadedVersionIndex ? 'loaded-version' : '';

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

  const columnDefs: NiceTableColumnDef<CtVersionInfo>[] = [
    {
      key: 'n',
      title: 'N',
      cellContent: (_row, index) => <>{index + 1}</>,
    },
    {
      key: 'time',
      title: 'Time',
      cellContent: (row, index) => index === loadedVersionIndex ? <strong>{ApmFormats.timeString(row.timeFrom)}</strong> : <EntityLink id={tableId}
                                                                                                                                    type={'singleChunkEditionBeta'} version={index === 0 ? undefined : row.timeFrom}
                                                                                                                                    name={ApmFormats.timeString(row.timeFrom)}/>
    },
    {
      key: 'author',
      title: 'Author',
      cellContent: (row) => <EntityLink id={row.authorTid} type={'person'}/>,
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
          'Only the latest version can be archived'}
      </div>
      <div className={'action-buttons-div'}>
        <ComponentWithPending pending={archiving} pendingTitle={'Archiving edition'}>
          <Button disabled={isArchived || !archivingEnabled} title={'Archive Edition'} variant={'danger'}
                  onClick={() => setArchiveConfirmationOpen(true)}>Archive Edition</Button>
        </ComponentWithPending>
      </div>
    </div>

    <div className={'versions-div'}>
      <h1>Versions</h1>
      <NiceTable rows={sortedVersions} columnDefs={columnDefs} getRowClassName={getRowClassName} className={'versions-table'}
                 getRowKey={(row) => `${row.id}-${row.timeFrom}`}/>
    </div>
    <ConfirmDialog show={archiveConfirmationOpen}
                   onHide={() => setArchiveConfirmationOpen(false)}
                   onAccept={handleArchive}
                   title={'Archive Edition'}
                   body={'Do you want to archive this edition?'}
                   acceptButtonLabel={'Yes'}
                   cancelButtonLabel={'No'}/>
  </div>;
}