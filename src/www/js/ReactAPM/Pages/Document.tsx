import {Link, useParams} from "react-router";


import {Tid} from "@/Tid/Tid";
import {useQuery} from "@tanstack/react-query";
import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {Breadcrumb} from "react-bootstrap";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {PageInfo} from "@/Api/DataSchema/ApiDocuments";
import BatchQuery from "@/Components/BatchQuery";


export default function Document() {

  const {id} = useParams();
  const context = useContext(AppContext);

  if (id === undefined) {
    return <div>Error: id is undefined</div>;
  }

  const docInfoQueryResult = useQuery({
    queryKey: ['docInfo', id], queryFn: () => {
      return context.apiClient.getDocumentInfo(Tid.fromCanonicalString(id), true, true);
    }
  });


  const provisionalBreadCrumb = <Breadcrumb>
    <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.docs()}}>Documents</Breadcrumb.Item>
    <Breadcrumb.Item active>{id}</Breadcrumb.Item>
  </Breadcrumb>;

  if (docInfoQueryResult.status === 'pending') {
    return <NormalPageContainer>{provisionalBreadCrumb}
      <div>Loading document info...</div>
    </NormalPageContainer>;
  }
  if (docInfoQueryResult.status === 'error') {
    return <NormalPageContainer>{provisionalBreadCrumb}
      <div className={'text-danger'}>Error: could not load document information</div>
    </NormalPageContainer>;
  }

  const docInfo = docInfoQueryResult.data;
  console.log('Document Info', docInfo);

  return (<NormalPageContainer>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.docs()}}>Documents</Breadcrumb.Item>
        <Breadcrumb.Item active>{docInfo.title}</Breadcrumb.Item>
      </Breadcrumb>

      <div>
        Data loaded. The document has {docInfo.pageIds.length} pages
      </div>
      <PageList pageInfoArray={docInfo.pageInfoArray ?? []}/>

    </NormalPageContainer>
  );
}

interface PageListProps {
  pageInfoArray: PageInfo[];
  numCols?: number;
}

function PageList(props: PageListProps) {
  const {pageInfoArray, numCols} = props;
  const cols = numCols ?? 20;
  return <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, max-content)`, gap: '0.5em'}}>
    {pageInfoArray.map((pageInfo, i) => <div key={i}>{pageInfo.foliation}</div>)}
  </div>

}

