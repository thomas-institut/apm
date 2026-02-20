import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {ApmFormats} from "@/pages/common/ApmFormats";

interface CollationTableInfoDivsProps {
  workId: string;
  chunkNumber: number;
}

export default function CollationTableInfoDivs(props: CollationTableInfoDivsProps) {

  const context = useContext(AppContext);

  const getTableData = () => {
    return context.apiClient.getCollationTablesForChunk(props.workId, props.chunkNumber);
  };

  const query = useQuery({queryKey: ['collationTables', props.workId, props.chunkNumber], queryFn: getTableData});

  if (query.status === 'pending') {
    return <div>Loading collation table and edition information...</div>;
  }

  if (query.status === 'error') {
    return <div>Error: {query.error.message}</div>;
  }

  const ctables = query.data.filter((ct) => ct.type === 'ctable');
  const editions = query.data.filter((ct) => ct.type === 'edition');

  return <>
    <div className={'chunkPageSection'}>
      <h2>Chunk Editions</h2>
      {editions.length === 0 ? <div><em>No editions</em></div> : null}
      <div className={'ctable-list'}>{editions.map((e) => <div key={e.tableId}>
        <EntityLink id={e.tableId} type={'singleChunkEdition'} name={e.title}/>, <small>last
        change: {ApmFormats.timeString(e.lastSave)} by <EntityLink id={e.authorId} type={'person'}/></small>
      </div>)}</div>
    </div>
    <div className={'chunkPageSection'}>
      <h2>Saved Collation Tables</h2>
      {ctables.length === 0 ? <div><em>No saved collation tables</em></div> : null}
      <div className={'ctable-list'}>{ctables.map((e) => <div key={e.tableId}>
        <EntityLink id={e.tableId} type={'collationTable'} name={e.title}/>, <small>last
        change: {ApmFormats.timeString(e.lastSave)} by <EntityLink id={e.authorId} type={'person'}/></small>
      </div>)}</div>
    </div>
  </>;

}