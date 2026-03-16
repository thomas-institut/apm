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
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null); // State für den Rahmen

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

  const handleImageOpen = (url: string, seq: number) => {
    setSelectedSeq(seq); // Setzt die ID für den schwarzen Rahmen
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (<NormalPageContainer>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.docs()}}>Documents</Breadcrumb.Item>
        <Breadcrumb.Item active>{docInfo.title}</Breadcrumb.Item>
      </Breadcrumb>

      <PageList pageInfoArray={docInfo.pageInfoArray ?? []} onPageClick={handleImageOpen} selectedPageSeq={selectedSeq}/>

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
  onPageClick?: (url: string, seq: number) => void;
  selectedPageSeq?: number | null;
}

/*function PageList(props: PageListProps) {
  const {pageInfoArray, numCols} = props;
  const cols = numCols ?? 20;
  return <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, max-content)`, gap: '0.5em'}}>
    {pageInfoArray.map((pageInfo, i) => <div key={i}>{pageInfo.foliation}</div>)}
  </div>

}*/

function PageList({ pageInfoArray, onPageClick, selectedPageSeq }: PageListProps) {
  // State für die Thumbnail-Größe (entspricht deiner MultiToggle-Logik)
  const [thumbnailSize, setThumbnailSize] = useState<number>(0); // 0 = None

  const sizeOptions = [
    { label: 'None', size: 0 },
    { label: 'Tiny', size: 50 },
    { label: 'Small', size: 100 },
    { label: 'Medium', size: 200 },
    { label: 'Large', size: 400 },
  ];

  const columnWidth = thumbnailSize > 0 ? `${thumbnailSize + 20}px` : "50px";

  return (
      <div className="page-list-panel">
        {/* Toolbar für Thumbnail-Steuerung */}
        <div className="panel-toolbar mb-2 d-flex align-items-center border-bottom pb-2"
             style={{ letterSpacing: '0.03em', fontSize: '0.85rem' }}>

          <span className="text-uppercase text-muted small fw-bold me-3">Thumbnails:</span>

          <div className="d-flex gap-3">
            {sizeOptions.map(opt => (
                <span
                    key={opt.label}
                    onClick={() => setThumbnailSize(opt.size)}
                    style={{
                      cursor: 'pointer',
                      color: thumbnailSize === opt.size ? '#000' : '#adb5bd',
                      fontWeight: thumbnailSize === opt.size ? 600 : 400,
                      transition: 'all 0.2s ease'
                    }}
                    className="text-uppercase small"                >
        {opt.label}
      </span>
            ))}
          </div>
        </div>

        {/* Die eigentliche Liste */}
        <div className="page-list-contents" style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, minmax(${columnWidth}, 1fr))`,
          gap: '0px',
          maxHeight: '800px',
          overflowY: 'auto',
          padding: '10px',
          alignItems: 'start' // Richtet Items am oberen Rand der Grid-Zelle aus
        }}>
          {pageInfoArray.map((page) => (
              <PageItem
                  key={page.pageId}
                  page={page}
                  size={thumbnailSize}
                  isSelected={selectedPageSeq === page.sequence}
                  onClick={() => onPageClick?.(page.jpgUrl || page.thumbnailUrl || '', page.sequence)}
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
  // Klassen basierend auf Status (für Kompatibilität mit bestehendem CSS)
  const classes = ["page-div"];
  if (page.foliationIsSet) classes.push("foliation-set");
  if (!page.isTranscribed) classes.push("without-transcription");
  if (isSelected) classes.push("page-selected");

  // Dynamisches Styling für den Text (Foliierung/Sequenz)
  const textStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    padding: '2px',
    color: page.isTranscribed ? 'black' : '#aaa',
    fontWeight: page.isTranscribed ? 'bold' : 'normal',
    transition: 'color 0.2s ease-in-out'
  };

  return (
      <div
          className={`page-big-div ${isSelected ? 'border border-primary' : ''}`}
          onClick={onClick}
          style={{
            cursor: 'pointer',
            textAlign: 'center',
            padding: '5px',
            borderRadius: '4px',
            borderRight: '1px solid #eee',
            borderBottom: '1px solid #eee',
            borderLeft: '1px solid #eee',
            borderTop: '1px solid #eee',
            backgroundColor: isSelected ? '#f0f8ff' : 'transparent'
          }}
      >
            <div className="thumbnail-div mb-1" style={{ height: `${size}px`, display: 'flex', justifyContent: 'center' }}>
              <img
                  src={page.thumbnailUrl || page.jpgUrl}
                  alt={`Page ${page.sequence}`}
                  onClick={onClick}
                  style={{
                    height: size > 0 ? `${size}px` : '0px',
                    objectFit: 'contain',
                    display: 'block',
                    // Optional: Auch das Vorschaubild etwas ausbleichen, wenn keine Transkription da ist
                    filter: page.isTranscribed ? 'none' : 'grayscale(30%) opacity(0.7)'
                  }}
              />
            </div>
        <div className={classes.join(' ')} style={textStyle} onClick={onClick}>
          {page.foliation || page.sequence}
        </div>
      </div>
  );
}

