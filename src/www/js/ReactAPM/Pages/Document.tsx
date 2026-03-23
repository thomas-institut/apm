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
import React, { useState, useCallback, memo } from 'react';


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

  const handleImageOpen = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (<NormalPageContainer>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{to: RouteUrls.docs()}}>Documents</Breadcrumb.Item>
        <Breadcrumb.Item active>{docInfo.title}</Breadcrumb.Item>
      </Breadcrumb>

      <PageList pageInfoArray={docInfo.pageInfoArray ?? []} onClick={handleImageOpen}/>

    </NormalPageContainer>
  );
}

interface PageListProps {
  pageInfoArray: PageInfo[];
  onClick?: (url: string, seq: number) => void;
}

interface PageItemProps {
    page: PageInfo;
    size: number;
    isSelected: boolean;
    onClick: (url: string, seq: number) => void;
}

function PageList({ pageInfoArray, onClick }: PageListProps) {
    const [thumbnailSize, setThumbnailSize] = useState<number>(0);
    const [selectedPage, setSelectedPage] = useState<number | null>(null);

    const sizeOptions = [
        { label: 'None', size: 0 },
        { label: 'Tiny', size: 50 },
        { label: 'Small', size: 100 },
        { label: 'Medium', size: 200 },
        { label: 'Large', size: 400 },
    ];
    
    const handleItemClick = useCallback((url: string, seq: number) => {
        setSelectedPage(seq); 
        onClick?.(url, seq); 
    }, [onClick]);

    const columnWidth = thumbnailSize > 0 ? `${thumbnailSize + 20}px` : "50px";

    return (
        <div className="page-list-panel">
            {/* Toolbar */}
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
                            className="text-uppercase small"
                        >
              {opt.label}
            </span>
                    ))}
                </div>
            </div>

            <div className="page-list-contents" style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${columnWidth}, 1fr))`,
                gap: '10px',
                maxHeight: '800px',
                overflowY: 'auto',
                padding: '10px',
                alignItems: 'start'
            }}>
                {pageInfoArray.map((page) => (
                    <PageItem
                        key={page.pageId}
                        page={page}
                        size={thumbnailSize}
                        isSelected={selectedPage === page.sequence}
                        onClick={handleItemClick}
                    />
                ))}
            </div>
        </div>
    );
}

const PageItem = memo(
    function PageItem({ page, size, isSelected, onClick }: PageItemProps) {

    const classes = ["page-div"];
    if (page.foliationIsSet) classes.push("foliation-set");
    if (!page.isTranscribed) classes.push("without-transcription");
    if (isSelected) classes.push("page-selected");

    const textStyle: React.CSSProperties = {
        fontSize: '0.8rem',
        padding: '2px',
        color: page.isTranscribed ? 'black' : '#aaa',
        fontWeight: page.isTranscribed ? 'bold' : 'normal',
    };

    const handleClick = () => {
        onClick(page.jpgUrl || page.thumbnailUrl || '', page.sequence);
    };

    return (
        <div
            className={`page-big-div ${isSelected ? 'border border-primary' : ''}`}
            onClick={handleClick}
            style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '5px',
                borderRadius: '4px',
                backgroundColor: isSelected ? '#f0f8ff' : 'transparent',
                transition: 'background-color 0.2s ease'
            }}
        >
            <div className="thumbnail-div mb-1" style={{ height: `${size}px`, display: 'flex', justifyContent: 'center' }}>
                <img
                    src={page.thumbnailUrl || page.jpgUrl}
                    alt={`Page ${page.sequence}`}
                    style={{
                        height: size > 0 ? `${size}px` : '0px',
                        objectFit: 'contain',
                        display: 'block',
                        transition: 'filter 0.3s ease',
                        filter: page.isTranscribed ? 'none' : 'grayscale(50%) opacity(0.6)'
                    }}
                />
            </div>

            <div className={classes.join(' ')} style={textStyle}>
                {page.foliation || page.sequence}
            </div>
        </div>
    );
});
