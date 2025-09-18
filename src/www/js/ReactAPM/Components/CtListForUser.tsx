import {RefObject, useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import {Spinner} from "react-bootstrap";
import {ApiUserCollationTables, TableInfo} from "@/Api/DataSchema/ApiUserCollationTables";
import PersonLink from "@/ReactAPM/Components/PersonLink";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Link} from "react-router";

interface CtListForUserProps {
  userId: number;
  edRef: RefObject<any>,
  ctRef: RefObject<any>,
  itemClassName?: string;
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
  const {userId} = props;
  const appContext = useContext(AppContext);

  const getCtListForUser = (userId: number) => {
    return appContext.apiClient.userCollationTables(userId);
  };

  const getListItems = (worksByAuthor: WorksByAuthor[], type: string) => {

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
          return (
            <p key={ctableInfo.id} className="dashboard-list-item-2">
              <Link to={RouteUrls.chunk(ctTablesByWorkItem.entityId, parseInt(ctableInfo.chunk))}>{ctableInfo.chunk}</Link>
              : <Link to={url}>{ctableInfo.title}</Link>
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

  const {isLoading, isError, data, error} = useQuery({
    queryKey: ['ctList', userId],
    queryFn: () => getCtListForUser(userId),
  });

  if (isLoading) {
    return (<Spinner animation="border" role="status"></Spinner>);
  }

  if (isError || data === undefined) {
    if (error === null) {
      return (<div>Error: Server did not provide any data</div>);
    }
    return (<div>Error: {error.message}</div>);
  }

  const worksByAuthor = getWorksByAuthorFromApiData(data);
  // console.log(worksByAuthor);

  return (<>
    <h1 ref={props.edRef}>Chunk Editions</h1>
    <div>
      {getListItems(worksByAuthor, 'edition')}
    </div>
    <h1 ref={props.ctRef}>Collation Tables</h1>
    <div>
      {getListItems(worksByAuthor, 'ctable')}
    </div>
  </>);

}