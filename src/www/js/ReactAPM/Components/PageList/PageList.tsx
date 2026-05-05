import React, { useCallback, useRef, useState } from 'react';
import { PageRange } from '@/PageRange';
import * as FoliationType from '../../../constants/FoliationType';
import PageItem from '@/ReactAPM/Components/PageList/PageItem';
import PageDefiner from '@/ReactAPM/Components/PageList/PageDefiner';
import { PageListProps, Range } from '@/ReactAPM/Components/PageList/PageListTypes';

export default function PageList({
    pageInfoArray,
    onPageClick,
    thumbnails = { initSize: 0, sizeSmall: 0, panel: false },
    pageDefiner = false,
    onDefineSuccess
}: PageListProps) {
    const [selectedPage, setSelectedPage] = useState<number | null>(null);
    const [ranges, setRanges] = useState<Range[]>([]);
    const [liveColsInputs, setLiveColsInputs] = useState<Record<number, string>>({});
    const [thumbnailSize, setThumbnailSize] = useState<number>(thumbnails.initSize);
    const pageListRef = useRef<HTMLDivElement>(null);

    const textRangeColors = ['#b8d4eb', '#d4b8eb', '#b8ebd4'];

    const getRangeForPage = (pageNum: number): Range | undefined => {
        for (const r of ranges) {
            const from = Math.max(1, Math.min(r.from, r.to));
            const to = Math.min(pageInfoArray.length, Math.max(r.from, r.to));
            if (pageNum >= from && pageNum <= to) return r;
        }
        return undefined;
    };

    const getColorForPage = (pageNum: number): string => {
        const rangeInfo = getRangeForPage(pageNum);
        if (!rangeInfo) return 'transparent';
        if (rangeInfo.type === 'text') {
            const textRanges = ranges.filter(range => range.type === 'text').sort((a, b) => Math.max(1, Math.min(a.from, a.to)) - Math.max(1, Math.min(b.from, b.to)));
            const idx = textRanges.findIndex(range => range === rangeInfo);
            return textRangeColors[idx % textRangeColors.length];
        }
        return '#d0d0d0';
    };

    const getLiveFoliation = useCallback((pageNum: number, currentRanges: Range[]): string | null => {
        let inRange = false;
        for (const r of currentRanges) {
            const from = Math.max(1, Math.min(r.from, r.to));
            const to = Math.min(pageInfoArray.length, Math.max(r.from, r.to));
            if (pageNum < from || pageNum > to) continue;
            inRange = true;
            if (!r.foliate) continue;
            const pr = new PageRange(from, to, pageInfoArray.length);
            if (r.type === 'text') {
                return pr.foliate(pageNum, r.foliationType ?? 1, r.foliationStart ?? 1, (r.foliationPrefix ?? '').replace(/\s+/g, ''), (r.foliationSuffix ?? '').replace(/\s+/g, ''), !!r.foliationReverse);
            }
            if (r.type === 'front') return pr.foliate(pageNum, FoliationType.FOLIATION_CONSECUTIVE, 1, 'x', '', false);
            const frontRange = currentRanges.find(rx => rx.type === 'front');
            let backStart = 1;
            if (frontRange) {
                const frontFrom = Math.max(1, Math.min(frontRange.from, frontRange.to));
                const frontTo = Math.min(pageInfoArray.length, Math.max(frontRange.from, frontRange.to));
                backStart = new PageRange(frontFrom, frontTo, pageInfoArray.length).toArray().length + 1;
            }
            return pr.foliate(pageNum, FoliationType.FOLIATION_CONSECUTIVE, backStart, 'x', '', false);
        }
        return inRange ? '' : null;
    }, [pageInfoArray.length]);

    const handleItemClick = useCallback((seq: number) => {
        setSelectedPage(seq);
        onPageClick?.(seq);
    }, [onPageClick]);

    const scrollToPage = useCallback((pageNum: number) => {
        const container = pageListRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
        if (!el) return;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elOffsetTop = el.offsetTop;
        const elOffsetBottom = elOffsetTop + el.offsetHeight;
        if (elOffsetTop < containerTop) container.scrollTo({ top: elOffsetTop - 10, behavior: 'smooth' });
        else if (elOffsetBottom > containerBottom) container.scrollTo({ top: elOffsetBottom - container.clientHeight + 10, behavior: 'smooth' });
    }, []);

    const sizeOptions = [
        { label: 'None', size: 0 },
        { label: 'Tiny', size: thumbnails.sizeSmall / 2 },
        { label: 'Small', size: thumbnails.sizeSmall },
        { label: 'Medium', size: thumbnails.sizeSmall * 2 },
        { label: 'Large', size: thumbnails.sizeSmall * 4 },
    ];
    const columnWidth = thumbnailSize > 0 ? `${thumbnailSize + 20}px` : '50px';

    return (
        <div className="page-list-panel d-flex gap-3 align-items-start">
            <div style={{ flex: 1, minWidth: 0 }}>
                {thumbnails.panel && thumbnails.sizeSmall !== 0 ? (
                    <div className="panel-toolbar mb-2 d-flex align-items-center border-bottom pb-2" style={{ letterSpacing: '0.03em', fontSize: '0.85rem' }}>
                        <span className="text-uppercase text-muted small fw-bold me-3">Thumbnails:</span>
                        <div className="d-flex gap-3">
                            {sizeOptions.map(opt => (
                                <span key={opt.label} onClick={() => setThumbnailSize(opt.size)} style={{ cursor: 'pointer', color: thumbnailSize === opt.size ? '#000' : '#adb5bd', fontWeight: thumbnailSize === opt.size ? 600 : 400, transition: 'all 0.2s ease' }} className="text-uppercase small">{opt.label}</span>
                            ))}
                        </div>
                    </div>
                ) : null}
                <div className="d-flex gap-3 align-items-start">
                    <div className="page-list-contents" ref={pageListRef} style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${columnWidth}, 1fr))`, gap: '10px', maxHeight: '800px', overflowY: 'auto', padding: '10px', alignItems: 'start', flex: 1 }}>
                        {pageInfoArray.map(page => (
                            <PageItem
                                key={page.pageId}
                                page={page}
                                withThumbnail={thumbnails.sizeSmall !== 0}
                                thumbnailSize={thumbnailSize}
                                isSelected={selectedPage === page.sequence}
                                onClick={handleItemClick}
                                backgroundColor={getColorForPage(page.pageNumber)}
                                liveFoliation={getLiveFoliation(page.pageNumber, ranges)}
                                liveNumCols={(() => {
                                    const r = getRangeForPage(page.pageNumber);
                                    if (r?.type !== 'text' || !r.foliate) return null;
                                    const live = liveColsInputs[r.id];
                                    if (live === undefined) return null;
                                    const inputVal = live === '' ? 1 : Math.max(1, Number(live));
                                    return Math.max(inputVal, page.numCols ?? 1);
                                })()}
                            />
                        ))}
                    </div>
                    {pageDefiner && pageInfoArray.length > 0 ? (
                        <div style={{ flexShrink: 0, minWidth: 200 }}>
                            <PageDefiner
                                docId={pageInfoArray[0].docId}
                                numPages={pageInfoArray.length}
                                onDefineSuccess={onDefineSuccess}
                                onRangesChange={setRanges}
                                onColsInputChange={(id, v) => setLiveColsInputs(prev => ({ ...prev, [id]: v }))}
                                scrollToPage={scrollToPage}
                            />
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
