import {Link, useParams} from "react-router";

import {Tid} from "@/Tid/Tid";
import {useQuery} from "@tanstack/react-query";
import React, {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {Breadcrumb} from "react-bootstrap";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {DocInfo} from "@/Api/DataSchema/ApiDocuments";
import {EntityData} from "@/EntityData/EntityData";
import PageList from "@/ReactAPM/Components/PageList/PageList";


interface DocInfoData {
  docInfo: DocInfo;
  entityData: EntityData;
}

export default function DefinePages() {

  const {id} = useParams();
  const context = useContext(AppContext);

  if (id === undefined) {
    return <div>Error: id is undefined</div>;
  }

  const docInfoQueryResult = useQuery({
    queryKey: ['docInfo', id], queryFn: async () : Promise<DocInfoData> => {
      return {
        docInfo: await  context.apiClient.getDocumentInfo(Tid.fromCanonicalString(id), true, true, true),
        entityData: await context.apiClient.getEntityData(Tid.fromCanonicalString(id))
      };
    }
  });

  const handleDefineSuccess = () => {
    docInfoQueryResult.refetch();
  };

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

  const docInfoData = docInfoQueryResult.data;
  console.log('Document Info Data', docInfoData);
  const docInfo = docInfoData.docInfo;

  return (<NormalPageContainer>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.docs()}}>Documents</Breadcrumb.Item>
        <Breadcrumb.Item href={RouteUrls.document(id)}>{docInfo.title}</Breadcrumb.Item>
        <Breadcrumb.Item active={true}>Define Pages</Breadcrumb.Item>
      </Breadcrumb>

      <PageList
          pageInfoArray={docInfo.pageInfoArray ?? []}
          thumbnails={{initSize: 80, sizeSmall: 80, panel: true}}
          pageDefiner={true}
          onDefineSuccess={handleDefineSuccess}
      />

    </NormalPageContainer>
  );
}

