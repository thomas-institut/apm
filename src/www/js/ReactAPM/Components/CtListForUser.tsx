import {ApiUserCollationTables, TableInfo} from "@/Api/DataSchema/ApiUserCollationTables";
import PersonLink from "@/ReactAPM/Components/PersonLink";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Link} from "react-router";
import {urlGen} from "@/pages/common/SiteUrlGen";
import {Tid} from "@/Tid/Tid";

type ListType = 'ctable' | 'edition';
interface CtListForUserProps {
  data: ApiUserCollationTables;
  itemClassName?: string;
  type: ListType;
}

interface WorksByAuthor {
  authorId: number;
  authorName: string;
  works: CtTablesByWork[];
}

interface CtTablesByWork {
  workId: string;
  workTitle: string;
  entityId: number;
  cTables: TableInfo[];
}

function getWorksByAuthorFromApiData(data: ApiUserCollationTables): WorksByAuthor[] {

  const allCtTablesByWork: CtTablesByWork[] = [];
  data.tableInfo.forEach((item: TableInfo) => {
    let ctTablesByWork = allCtTablesByWork.find(w => w.workId === item.work);
    if (ctTablesByWork === undefined) {
      ctTablesByWork = {workId: item.work, workTitle: '', entityId: -1,  cTables: []};
      allCtTablesByWork.push(ctTablesByWork);
    }
    if (ctTablesByWork.workTitle === '') {
      ctTablesByWork.workTitle = data.workInfo[item.work].title;
      ctTablesByWork.entityId = data.workInfo[item.work].entityId;
    }
    ctTablesByWork.cTables.push(item);
  });
  const worksByAuthor: WorksByAuthor[] = [];
  Object.keys(data.workInfo).forEach((workId: string) => {
    const workInfo = data.workInfo[workId];
    let worksByAuthorItem = worksByAuthor.find( w => w.authorId === workInfo.authorId);
    if (worksByAuthorItem === undefined) {
      worksByAuthorItem = {authorId: workInfo.authorId, authorName: workInfo.author_name, works: []};
      worksByAuthor.push(worksByAuthorItem);
    }
    const cTablesByWork = allCtTablesByWork.filter(w => w.workId === workId);
    if (cTablesByWork !== undefined) {
      worksByAuthorItem.works.push(...cTablesByWork);
    }
  });
  return worksByAuthor;
}


export default function CtListForUser(props: CtListForUserProps) {

  const data= props.data;
  const type = props.type;


  const getListItems = (worksByAuthor: WorksByAuthor[], type: ListType) => {
    if (worksByAuthor.length === 0) {
      return (<div><em>None</em></div>);
    }

    return worksByAuthor.map((worksByAuthorItem: WorksByAuthor) => {
      return worksByAuthorItem.works.map((ctTablesByWorkItem: CtTablesByWork) => {

        const cTables = ctTablesByWorkItem.cTables.filter(  ctableInfo => ctableInfo.type === type);

        if (cTables.length === 0) {
          return null;
        }
        const tableElems = cTables.sort(
          (a,b) => {return parseInt(a.chunk) - parseInt(b.chunk)}
        ).map((ctableInfo: TableInfo) => {
          const url = type === 'edition' ? RouteUrls.singleChunkEdition(ctableInfo.id) : RouteUrls.collationTable(ctableInfo.id);
          const entityType = type === 'edition' ? 'singleChunkEdition' : 'collationTable';
          return (
            <p key={ctableInfo.id} className="dashboard-list-item-2">
              <a href={urlGen.siteChunkPage(ctableInfo.work, parseInt(ctableInfo.chunk))}>{ctableInfo.chunk}</a> :
              <EntityLink id={ctableInfo.id} type={entityType} name={ctableInfo.title} active={true} openInNewTab={true}/>
            </p>
          )
        })

        return(
          <div key={type + ctTablesByWorkItem.workId} style={{marginBottom: '1em'}}>
            <p className="dashboard-list-item">
              <PersonLink personId={worksByAuthorItem.authorId}/>,&nbsp;
              <EntityLink id={ctTablesByWorkItem.entityId} type="work"/>
            </p>
            <div>
              {tableElems}
            </div>

          </div>
        )
      })
    });
  };


  const worksByAuthor = getWorksByAuthorFromApiData(data);

  return (
    <div>
      {getListItems(worksByAuthor, type)}
    </div>
    );

}