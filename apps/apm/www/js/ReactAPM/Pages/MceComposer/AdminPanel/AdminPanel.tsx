import './AdminPanel.css';
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {Button} from "react-bootstrap";
import {MceVersionInfo} from "@/Api/DataSchema/ApiMceData";
import NiceTable, {NiceTableColumnDef} from "@/ReactAPM/Components/NiceTable/NiceTable";
import {ApmFormats} from "@/pages/common/ApmFormats";
import EntityLink from "@/ReactAPM/Components/EntityLink";


interface AdminPanelProps extends TabbableElementProps {
  mceId: number;
  version: string | null;
  versions: MceVersionInfo[];
}


export default function AdminPanel({mceId, version, versions}: AdminPanelProps) {

  const sortedVersions = [...versions].sort((a, b) => b.timeString.localeCompare(a.timeString));

  const loadedVersionIndex = version === null ? 0 : sortedVersions.findIndex(v => v.timeString === version);

  const getRowClassName = (row: MceVersionInfo, index: number) => index === loadedVersionIndex ? 'loaded-version' : '';

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
    <div className={'control-div'}>
      <h1>Actions</h1>
      <div className={'action-buttons-div'}>
        <Button disabled={true} title={'Archiving editions not implemented yet'}>Archive Edition</Button>
        <Button disabled={true} title={'Cloning editions not implemented yet'}>Clone Edition</Button>
      </div>

    </div>

    <div className={'versions-div'}>
      <h1>Versions</h1>
      <NiceTable rows={sortedVersions} columnDefs={columnDefs} getRowClassName={getRowClassName} className={'versions-table'}
                 getRowKey={(row) => `${row.mceId}-${row.timeString}`}/>
    </div>
  </div>;
}

