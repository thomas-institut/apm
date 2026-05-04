import React, { memo } from 'react';
import { File, LayoutSplit, LayoutThreeColumns } from 'react-bootstrap-icons';
import { PageItemProps } from '@/ReactAPM/Components/PageList/PageListTypes';

function renderColumnIcon(numCols: number): React.ReactNode {
    if (numCols >= 4) {
        return (
            <span style={{ display: 'inline-flex', gap: 0 }}>
                <span style={{ display: 'inline-block', transform: 'scaleX(0.6)', transformOrigin: 'right center' }}><LayoutSplit /></span>
                <span style={{ display: 'inline-block', transform: 'scaleX(0.6)', transformOrigin: 'left center' }}><LayoutSplit /></span>
            </span>
        );
    }
    if (numCols === 3) return <LayoutThreeColumns />;
    if (numCols === 2) return <LayoutSplit />;
    return <File />;
}

const PageItem = memo(function PageItem({
    page,
    withThumbnail,
    thumbnailSize,
    isSelected,
    onClick,
    backgroundColor,
    liveFoliation,
    liveNumCols
}: PageItemProps) {
    const classes = ['page-div'];
    if (page.foliationIsSet) classes.push('foliation-set');
    if (!page.isTranscribed) classes.push('without-transcription');
    if (isSelected) classes.push('page-selected');

    const textStyle: React.CSSProperties = {
        fontSize: '0.8rem',
        padding: '2px',
        color: page.isTranscribed ? 'black' : '#aaa',
        fontWeight: page.isTranscribed ? 'bold' : 'normal',
    };

    const handleClick = () => {
        onClick(page.sequence);
    };

    const bgColor = isSelected ? '#f0f8ff' : (backgroundColor || 'transparent');

    return (
        <div
            className={`page-big-div ${isSelected ? 'border border-primary' : ''}`}
            data-page={page.pageNumber}
            onClick={handleClick}
            style={{
                cursor: 'pointer',
                textAlign: 'center',
                padding: '5px',
                borderRadius: '4px',
                backgroundColor: bgColor,
                transition: 'background-color 0.2s ease'
            }}
        >
            {withThumbnail ? (
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
            ) : null}
            <div className={classes.join(' ')} style={textStyle}>
                {page.foliation || page.sequence}
                {liveFoliation && liveFoliation !== String(page.foliation) ? (
                    <div style={{ fontStyle: 'italic', color: '#888', fontSize: '0.85em' }}>{liveFoliation}</div>
                ) : null}
                {liveFoliation === '' && page.foliationIsSet ? (
                    <div style={{ fontStyle: 'italic', color: '#888', fontSize: '0.85em' }}>{page.sequence}</div>
                ) : null}
                {liveNumCols != null ? (
                    <div style={{ fontStyle: 'italic', color: liveNumCols > (page.numCols ?? 1) ? '#333' : '#888', fontSize: '0.85em' }}>
                        {renderColumnIcon(liveNumCols)}
                    </div>
                ) : null}
            </div>
        </div>
    );
});

export default PageItem;
