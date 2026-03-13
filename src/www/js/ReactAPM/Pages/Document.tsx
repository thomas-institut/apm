import {Link, useParams} from "react-router";


import {Tid} from "@/Tid/Tid";
import {useQuery} from "@tanstack/react-query";
import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {Breadcrumb} from "react-bootstrap";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {DocInfo, PageInfo} from "@/Api/DataSchema/ApiDocuments";
import {EntityData} from "@/EntityData/EntityData";

import React, { useState } from 'react';

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

  return (<NormalPageContainer>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.docs()}}>Documents</Breadcrumb.Item>
        <Breadcrumb.Item active>{docInfo.title}</Breadcrumb.Item>
      </Breadcrumb>

      <PageList pageInfoArray={docInfo.pageInfoArray ?? []}/>

    </NormalPageContainer>
  );
}

/*interface PageListProps {
  pageInfoArray: PageInfo[];
  numCols?: number;
}*/

interface PageListProps {
  pageInfoArray: PageInfo[];
  numCols?: number;
  onPageSelect?: (sequence: number) => void;
  selectedPageSeq?: number;
}

/*function PageList(props: PageListProps) {
  const {pageInfoArray, numCols} = props;
  const cols = numCols ?? 20;
  return <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, max-content)`, gap: '0.5em'}}>
    {pageInfoArray.map((pageInfo, i) => <div key={i}>{pageInfo.foliation}</div>)}
  </div>

}*/

function PageList({ pageInfoArray, onPageSelect, selectedPageSeq }: PageListProps) {
  // State für die Thumbnail-Größe (entspricht deiner MultiToggle-Logik)
  const [thumbnailSize, setThumbnailSize] = useState<number>(0); // 0 = None

  const sizeOptions = [
    { label: 'None', size: 0 },
    { label: 'Tiny', size: 50 },
    { label: 'Small', size: 100 },
    { label: 'Medium', size: 200 },
    { label: 'Large', size: 400 },
  ];

  return (
      <div className="page-list-panel">
        {/* Toolbar für Thumbnail-Steuerung */}
        <div className="panel-toolbar mb-3">
          <span className="me-2">Thumbnails:</span>
          <div className="btn-group btn-group-sm">
            {sizeOptions.map(opt => (
                <button
                    key={opt.label}
                    className={`btn btn-outline-secondary ${thumbnailSize === opt.size ? 'active' : ''}`}
                    onClick={() => setThumbnailSize(opt.size)}
                >
                  {opt.label}
                </button>
            ))}
          </div>
        </div>

        {/* Die eigentliche Liste */}
        <div className="page-list-contents" style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          maxHeight: '600px',
          overflowY: 'auto'
        }}>
          {pageInfoArray.map((page) => (
              <PageItem
                  key={page.pageId}
                  page={page}
                  size={thumbnailSize}
                  isSelected={selectedPageSeq === page.sequence}
                  onClick={() => onPageSelect?.(page.sequence)}
              />
          ))}
        </div>
      </div>
  );
}

function PageItem({ page, size, isSelected, onClick }: {
  page: PageInfo,
  size: number,
  isSelected: boolean,
  onClick: () => void
}) {
  // Logik aus dem alten Code: Klassen basierend auf Status
  const classes = ["page-div"];
  if (page.foliationIsSet) classes.push("foliation-set");
  if (!page.isTranscribed) classes.push("without-transcription");
  if (isSelected) classes.push("page-selected");

  return (
      <div
          className={`page-big-div ${isSelected ? 'border border-primary' : ''}`}
          onClick={onClick}
          style={{ cursor: 'pointer', textAlign: 'center' }}
      >
        {size > 0 && (
            <div className="thumbnail-div mb-1">
              <img
                  src={page.thumbnailUrl || page.jpgUrl}
                  alt={`Page ${page.sequence}`}
                  style={{ height: `${size}px`, objectFit: 'contain', display: 'block' }}
                  loading="lazy" // React-native Ersatz für das manuelle Batch-Loading
              />
            </div>
        )}
        <div className={classes.join(' ')} style={{ fontSize: '0.8rem', padding: '2px' }}>
          {page.foliation || page.sequence}
        </div>
      </div>
  );
}

