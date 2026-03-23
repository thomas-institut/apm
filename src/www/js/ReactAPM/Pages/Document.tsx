import {Link, useParams} from "react-router";

import {Tid} from "@/Tid/Tid";
import {useQuery} from "@tanstack/react-query";
import React, {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {Breadcrumb} from "react-bootstrap";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {DocInfo, PageInfo} from "@/Api/DataSchema/ApiDocuments";
import {EntityData} from "@/EntityData/EntityData";
import PageList from "@/ReactAPM/Components/DocumentPageList";
import {forEach} from "react-bootstrap/ElementChildren";


interface DocInfoData {
  docInfo: DocInfo;
  entityData: EntityData;
}

export default function Document() {

  const {id} = useParams();
  const context = useContext(AppContext);

  if (id === undefined) {
    return <div>Error: id is undefined</div>;
  }

  const docInfoQueryResult = useQuery({
    queryKey: ['docInfo', id], queryFn: async () : Promise<DocInfoData> => {
      return {
        docInfo: await  context.apiClient.getDocumentInfo(Tid.fromCanonicalString(id), true, true),
        entityData: await context.apiClient.getEntityData(Tid.fromCanonicalString(id))
      };
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

  const docInfoData = docInfoQueryResult.data;
  console.log('Document Info Data', docInfoData);
  const docInfo = docInfoData.docInfo;

  const handleImageOpen = (seq: number) => {
    const page = docInfo.pageInfoArray.find((p: any) => p.sequence === seq) ;

    if (page) {
      const url = page.thumbnailUrl || page.jpgUrl || '';

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (<NormalPageContainer>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.docs()}}>Documents</Breadcrumb.Item>
        <Breadcrumb.Item active>{docInfo.title}</Breadcrumb.Item>
      </Breadcrumb>

      <PageList pageInfoArray={docInfo.pageInfoArray ?? []} withThumbnails={true} thumbnailsInitialSize={0} withThumbnailsPanel={true} thumbnailsSizeSmall={80} onClick={handleImageOpen}/>

    </NormalPageContainer>
  );
}

