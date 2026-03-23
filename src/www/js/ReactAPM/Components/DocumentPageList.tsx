import { PageInfo } from "@/Api/DataSchema/ApiDocuments";
import React, { useState, useCallback, memo } from 'react';

interface PageListProps {
    pageInfoArray: PageInfo[];
    withThumbnails: boolean;
    thumbnailsInitialSize: number;
    withThumbnailsPanel: boolean;
    thumbnailsSizeSmall: number;
    onClick?: (seq: number) => void;
}

interface PageItemProps {
    page: PageInfo;
    withThumbnail: boolean;
    thumbnailSize: number;
    isSelected: boolean;
    onClick: (seq: number) => void;
}

export default function PageList({ pageInfoArray, withThumbnails, thumbnailsInitialSize, withThumbnailsPanel, thumbnailsSizeSmall, onClick }: PageListProps) {
    const [thumbnailSize, setThumbnailSize] = useState<number>(thumbnailsInitialSize);
    const [selectedPage, setSelectedPage] = useState<number | null>(null);

    const sizeOptions = [
        { label: 'None', size: 0 },
        { label: 'Tiny', size: thumbnailsSizeSmall/2 },
        { label: 'Small', size: thumbnailsSizeSmall },
        { label: 'Medium', size: thumbnailsSizeSmall*2 },
        { label: 'Large', size: thumbnailsSizeSmall*4 },
    ];

    const handleItemClick = useCallback((seq: number) => {
        setSelectedPage(seq);
        onClick?.(seq);
    }, [onClick]);

    const columnWidth = thumbnailSize > 0 ? `${thumbnailSize + 20}px` : "50px";

    const thumbnailPanel = (
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
    )

    return (
        <div className="page-list-panel">

            {withThumbnailsPanel ? thumbnailPanel : ''}

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
                        withThumbnail={withThumbnails}
                        thumbnailSize={thumbnailSize}
                        isSelected={selectedPage === page.sequence}
                        onClick={handleItemClick}
                    />
                ))}
            </div>
        </div>
    );
}

const PageItem = memo(
    function PageItem({ page, withThumbnail, thumbnailSize, isSelected, onClick }: PageItemProps) {

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
            onClick(page.sequence);
        };

        const thumbnail = (
            <div className="thumbnail-div mb-1" style={{ height: `${thumbnailSize}px`, display: 'flex', justifyContent: 'center' }}>
                <img
                    src={page.thumbnailUrl || page.jpgUrl}
                    alt={`Page ${page.sequence}`}
                    style={{
                        height: thumbnailSize > 0 ? `${thumbnailSize}px` : '0px',
                        objectFit: 'contain',
                        display: 'block',
                        transition: 'filter 0.3s ease',
                        filter: page.isTranscribed ? 'none' : 'grayscale(50%) opacity(0.6)'
                    }}
                />
            </div>
        )

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

                {withThumbnail ? thumbnail : ''}

                <div className={classes.join(' ')} style={textStyle}>
                    {page.foliation || page.sequence}
                </div>
            </div>
        );
    });