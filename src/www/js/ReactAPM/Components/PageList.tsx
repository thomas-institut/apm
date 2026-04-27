import { PageInfo } from "@/Api/DataSchema/ApiDocuments";
import React, { useState, useEffect, useCallback, memo, useRef } from 'react';

import { PageRange } from '@/PageRange';
import * as FoliationType from '../../constants/FoliationType';
import * as Entity from '../../constants/Entity';
import { urlGen } from '@/pages/common/SiteUrlGen'

type RangeType = 'text' | 'front' | 'back';

type RangeConfig = {
    id: number;
    from: number;
    to: number;
    type: RangeType;
    foliate: boolean;
    textFoliationType?: number;
    textFoliationStart?: number;
    textFoliationPrefix?: string;
    textFoliationSuffix?: string;
    textFoliationReverse?: boolean;
    autoFrontBack?: boolean;
    foliateFrontBack?: boolean;
    createCols?: boolean;
    colsNumber?: number;
};

type PageRangeMatch = {
    type: RangeType;
    range: RangeConfig;
};

type PageDefinition = {
    docId: number;
    page: number;
    type?: number;
    foliation?: string;
    overwriteFoliation?: boolean;
};

interface PageListProps {
    pageInfoArray: PageInfo[];
    onPageClick?: (seq: number) => void;
    thumbnails?: Thumbnail;
    definer?: boolean;
    onDefineSuccess?: () => void;
}

interface PageItemProps {
    page: PageInfo;
    withThumbnail: boolean;
    thumbnailSize: number;
    isSelected: boolean;
    onClick: (seq: number) => void;
    backgroundColor?: string;
    liveFoliation?: string;
}

interface Thumbnail {
    initSize: number;
    sizeSmall: number;
    panel: boolean;
}

interface PageDefinerProps {
    docId: number;
    numPages: number;
    onDefineSuccess?: () => void;
    onRangesChange?: (ranges: RangeConfig[]) => void;
    scrollToPage?: (pageNum: number) => void;
    urlGen?: {
        apiBulkPageSettings: () => string;
    };
}

export default function PageList({ pageInfoArray, onPageClick, thumbnails= {initSize: 0, sizeSmall: 0, panel: false}, definer=false, onDefineSuccess }: PageListProps) {

    const [selectedPage, setSelectedPage] = useState<number | null>(null);
    const [ranges, setRanges] = useState<RangeConfig[]>([]);

    // Colors for text ranges (blue, violet, green)
    const textRangeColors = ['#b8d4eb', '#d4b8eb', '#b8ebd4'];

    // Returns the range type and object for a given page number
    const getRangeForPage = (pageNum: number): PageRangeMatch | undefined => {
        for (const r of ranges) {
            const from = Math.max(1, Math.min(r.from, r.to));
            const to = Math.min(pageInfoArray.length, Math.max(r.from, r.to));
            if (pageNum >= from && pageNum <= to) {
                return { type: r.type, range: r };
            }
        }
        return undefined;
    };

    // Returns the background color for a given page number
    const getColorForPage = (pageNum: number) => {
        const rangeInfo = getRangeForPage(pageNum);
        if (!rangeInfo) return 'transparent';
        if (rangeInfo.type === 'text') {
            const textRanges = ranges.filter(range => range.type === 'text').sort((a, b) => {
                const aFrom = Math.max(1, Math.min(a.from, a.to));
                const bFrom = Math.max(1, Math.min(b.from, b.to));
                return aFrom - bFrom;
            });
            const idx = textRanges.findIndex(range => range === rangeInfo.range);
            return textRangeColors[idx % textRangeColors.length];
        }
        return '#d0d0d0'; // grey for front/back
    };

    const handleItemClick = useCallback((seq: number) => {
        setSelectedPage(seq);
        onPageClick?.(seq);
    }, [onPageClick]);

    // Computes the live foliation label for a page based on current ranges
    const getLiveFoliation = useCallback((pageNum: number, currentRanges: RangeConfig[]): string => {
        for (const r of currentRanges) {
            if (!r.foliate) continue;
            const from = Math.max(1, Math.min(r.from, r.to));
            const to = Math.min(pageInfoArray.length, Math.max(r.from, r.to));
            if (pageNum < from || pageNum > to) continue;
            const pr = new PageRange(from, to, pageInfoArray.length);
            if (r.type === 'text' && !r.autoFrontBack) {
                return pr.foliate(pageNum, r.textFoliationType ?? 1, r.textFoliationStart ?? 1,
                    (r.textFoliationPrefix ?? '').replace(/\s+/g, ''),
                    (r.textFoliationSuffix ?? '').replace(/\s+/g, ''),
                    !!r.textFoliationReverse);
            } else if (r.type === 'front') {
                return pr.foliate(pageNum, FoliationType.FOLIATION_CONSECUTIVE, 1, 'x', '', false);
            } else if (r.type === 'back') {
                const frontRange = currentRanges.find(rx => rx.type === 'front');
                let backStart = 1;
                if (frontRange) {
                    const frontFrom = Math.max(1, Math.min(frontRange.from, frontRange.to));
                    const frontTo = Math.min(pageInfoArray.length, Math.max(frontRange.from, frontRange.to));
                    backStart = new PageRange(frontFrom, frontTo, pageInfoArray.length).toArray().length + 1;
                }
                return pr.foliate(pageNum, FoliationType.FOLIATION_CONSECUTIVE, backStart, 'x', '', false);
            }
        }
        return '';
    }, [pageInfoArray.length]);

    const [thumbnailSize, setThumbnailSize] = useState<number>(thumbnails.initSize);

    const sizeOptions = [
        { label: 'None', size: 0 },
        { label: 'Tiny', size: thumbnails.sizeSmall/2 },
        { label: 'Small', size: thumbnails.sizeSmall },
        { label: 'Medium', size: thumbnails.sizeSmall*2 },
        { label: 'Large', size: thumbnails.sizeSmall*4 },
    ];

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


    const pageListRef = useRef<HTMLDivElement>(null);

    const scrollToPage = useCallback((pageNum: number) => {
        const container = pageListRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-page="${pageNum}"]`) as HTMLElement | null;
        if (!el) return;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elOffsetTop = el.offsetTop;
        const elOffsetBottom = elOffsetTop + el.offsetHeight;
        if (elOffsetTop < containerTop) {
            container.scrollTo({ top: elOffsetTop - 10, behavior: 'smooth' });
        } else if (elOffsetBottom > containerBottom) {
            container.scrollTo({ top: elOffsetBottom - container.clientHeight + 10, behavior: 'smooth' });
        }
    }, []);

    return (
        <div className="page-list-panel d-flex gap-3 align-items-start">

            <div style={{ flex: 1, minWidth: 0 }}>
                {(thumbnails.panel && thumbnails?.sizeSmall!==0) ? thumbnailPanel : ''}

                <div className="d-flex gap-3 align-items-start">
                    <div className="page-list-contents" ref={pageListRef} style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(auto-fill, minmax(${columnWidth}, 1fr))`,
                        gap: '10px',
                        maxHeight: '800px',
                        overflowY: 'auto',
                        padding: '10px',
                        alignItems: 'start',
                        flex: 1
                    }}>
                        {pageInfoArray.map((page) => (
                            <PageItem
                                key={page.pageId}
                                page={page}
                                withThumbnail={thumbnails?.sizeSmall!==0}
                                thumbnailSize={thumbnailSize ?? 0}
                                isSelected={selectedPage === page.sequence}
                                onClick={handleItemClick}
                                backgroundColor={getColorForPage(page.pageNumber)}
                                liveFoliation={getLiveFoliation(page.pageNumber, ranges)}
                            />
                        ))}
                    </div>
                    {definer ? <div style={{ flexShrink: 0, minWidth: 200 }}><PageDefiner docId={pageInfoArray[0].docId} numPages={pageInfoArray.length} urlGen={urlGen} onDefineSuccess={onDefineSuccess} onRangesChange={setRanges} scrollToPage={scrollToPage}/></div> : ''}
                </div>
            </div>

        </div>
    );
}

// Knob control for page number input – drag up/down or click to type
const PageKnob: React.FC<{
    value: number;
    onChange: (val: number) => void;
    min?: number;
    max?: number;
}> = ({ value, onChange, min = 1, max = 9999 }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const valueRef = useRef(value);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { valueRef.current = value; }, [value]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing) return;
        setIsDragging(true);
        const startY = e.clientY;
        const startVal = valueRef.current;
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const sensitivity = 4;
            const delta = Math.floor((startY - moveEvent.clientY) / sensitivity);
            const newVal = Math.max(min, Math.min(max, startVal + delta));
            if (newVal !== valueRef.current) onChange(newVal);
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (isEditing) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        onChange(Math.max(min, Math.min(max, value + delta)));
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isDragging) return;
        e.preventDefault();
        setEditValue(String(value));
        setIsEditing(true);
        setTimeout(() => { inputRef.current?.select(); }, 0);
    };

    const commitEdit = () => {
        const n = parseInt(editValue, 10);
        if (!Number.isNaN(n)) {
            onChange(Math.max(min, Math.min(max, n)));
        }
        setIsEditing(false);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') commitEdit();
        if (e.key === 'Escape') setIsEditing(false);
    };

    return (
        <div
            className="knob-mini"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            onClick={handleClick}
            style={{
                userSelect: 'none',
                touchAction: 'none',
                width: '36px',
                height: '36px',
                border: isDragging ? '1.5px solid #007bff' : isEditing ? '1.5px solid #28a745' : '1.5px solid #333',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isEditing ? 'default' : 'ns-resize',
                background: '#f8f9fa',
                overflow: 'hidden',
            }}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleEditKeyDown}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#28a745',
                        outline: 'none',
                        padding: 0,
                    }}
                />
            ) : (
                <span style={{ fontSize: '11px', color: isDragging ? '#007bff' : '#333', fontWeight: 600, lineHeight: 1 }}>
                    {value}
                </span>
            )}
        </div>
    );
};

// Editor for a single range – extracted as a stable component to prevent remounts while typing
const RangeEditor: React.FC<{
    r: RangeConfig;
    numPages: number;
    updateRange: (id: number, patch: Partial<RangeConfig>) => void;
    removeRange: (id: number) => void;
    focusedRangeId: number | null;
    setFocusedRangeId: (id: number | null) => void;
    ranges: RangeConfig[];
    preserveWindowScroll: (fn: () => void) => void;
    scrollToPage?: (pageNum: number) => void;
}> = ({ r, numPages, updateRange, removeRange, focusedRangeId, setFocusedRangeId, ranges, preserveWindowScroll, scrollToPage }) => {
    // Foliation popup state for text ranges
    const [foliationPopupOpen, setFoliationPopupOpen] = useState(false);
    const [startInput, setStartInput] = useState<string>(String(r.textFoliationStart ?? 1));
    const [colsInput, setColsInput] = useState<string>(String(r.colsNumber ?? 1));
    useEffect(() => { setStartInput(String(r.textFoliationStart ?? 1)); }, [r.textFoliationStart]);
    useEffect(() => { setColsInput(String(r.colsNumber ?? 1)); }, [r.colsNumber]);
    const foliationPopupRef = useRef<HTMLDivElement>(null);

    // Close popup when clicking outside
    useEffect(() => {
        if (!foliationPopupOpen) return;
        const handler = (e: MouseEvent) => {
            if (foliationPopupRef.current && !foliationPopupRef.current.contains(e.target as Node)) {
                setFoliationPopupOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [foliationPopupOpen]);

    // Knob change handlers for from/to
    const handleFromChange = useCallback((val: number) => {
        updateRange(r.id, { from: val });
        scrollToPage?.(val);
    }, [r.id, updateRange, scrollToPage]);

    const handleToChange = useCallback((val: number) => {
        updateRange(r.id, { to: val });
        scrollToPage?.(val);
    }, [r.id, updateRange, scrollToPage]);

    const pr = new PageRange(
        Math.max(1, Math.min(r.from, r.to)),
        Math.min(numPages, Math.max(r.from, r.to)),
        numPages
    );
    const textFoliationPreview = r.type === 'text' && r.foliate && !r.autoFrontBack
        ? pr.toStringWithFoliation('', ' - ', '', r.textFoliationType!, r.textFoliationStart!, (r.textFoliationPrefix||'').replace(/\s+/g,''), (r.textFoliationSuffix||'').replace(/\s+/g,''), !!r.textFoliationReverse)
        : '';
    // Compute back-matter foliation start: begins after front-matter ends
    const fbFoliationStart = React.useMemo(() => {
        if (r.type === 'front') return 1;
        if (r.type === 'back') {
            const frontRange = ranges.find(rx => rx.type === 'front');
            if (frontRange) {
                const fpr = new PageRange(
                    Math.max(1, Math.min(frontRange.from, frontRange.to)),
                    Math.min(numPages, Math.max(frontRange.from, frontRange.to)),
                    numPages
                );
                return fpr.toArray().length + 1;
            }
            return 1;
        }
        return 1;
    }, [r.type, r.from, r.to, ranges, numPages]);
    const fbFoliationPreview = r.foliate && (r.type === 'front' || r.type === 'back')
        ? pr.toStringWithFoliation('', ' - ', '', FoliationType.FOLIATION_CONSECUTIVE, fbFoliationStart, 'x')
        : '';

    const isFocused = focusedRangeId === r.id;

    // Background color based on range type
    const textRangeColors = ['#b8d4eb', '#d4b8eb', '#b8ebd4'];
    let cardBgColor = 'transparent';
    if (r.type === 'text') {
        const textRanges = ranges.filter(rx => rx.type === 'text').sort((a, b) => {
            const aFrom = Math.max(1, Math.min(a.from, a.to));
            const bFrom = Math.max(1, Math.min(b.from, b.to));
            return aFrom - bFrom;
        });
        const idx = textRanges.findIndex(rx => rx.id === r.id);
        cardBgColor = textRangeColors[idx % textRangeColors.length];
    } else if (r.type === 'front' || r.type === 'back') {
        cardBgColor = '#d0d0d0'; // grey
    }

    return (
        <div
            className="card mb-2"
            onClick={() => setFocusedRangeId(r.id)}
            onFocusCapture={() => setFocusedRangeId(r.id)}
            onBlurCapture={(e) => {
                // Only reset when focus leaves the card entirely
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setFocusedRangeId(null);
                }
            }}
            style={{
                padding: '4px 8px 4px 8px',
                border: '1px solid ' + (isFocused ? '#0d6efd' : '#999'),
                borderRadius: 6,
                boxShadow: isFocused ? '0 0 0 0.2rem rgba(13,110,253,.25)' : 'none',
                backgroundColor: 'transparent',
                transition: 'background-color 0.6s ease',
                position: 'relative'
            }}
        >
            <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: 2 }}>
                <span
                    className="badge text-uppercase text-dark"
                    style={{ backgroundColor: cardBgColor, cursor: 'pointer' }}
                    onClick={() => {
                        const hasFront = ranges.some(x => x.id !== r.id && x.type === 'front');
                        const hasBack = ranges.some(x => x.id !== r.id && x.type === 'back');
                        const types: RangeType[] = ['front', 'text', 'back'].filter(t =>
                            t !== 'front' || !hasFront || r.type === 'front'
                        ).filter(t =>
                            t !== 'back' || !hasBack || r.type === 'back'
                        ) as RangeType[];
                        const currentIdx = types.indexOf(r.type);
                        const nextIdx = (currentIdx + 1) % types.length;
                        updateRange(r.id, { type: types[nextIdx] });
                    }}
                    title="Click to change type"
                >{r.type}</span>
                <button className="btn btn-sm" onClick={() => removeRange(r.id)} style={{ lineHeight: 1, padding: '1px 5px', fontSize: '0.85em', border: 'none', background: 'none', color: '#555', alignSelf: 'flex-end' }}>×</button>
            </div>
            <div className="d-flex align-items-center gap-1" style={{ marginBottom: 2, marginTop: 6 }}>
                <div className="d-flex align-items-center justify-content-center gap-2">
                    <PageKnob
                        value={r.from}
                        onChange={handleFromChange}
                        min={1}
                        max={numPages}
                    />
                    <label className="me-1">–</label>
                    <PageKnob
                        value={r.to}
                        onChange={handleToChange}
                        min={1}
                        max={numPages}
                    />
                </div>
                {/* Foliation button: opens popup for text ranges, toggles foliate for front/back */}
                {(((r.type === 'text') && !r.autoFrontBack) || (r.type !== 'text')) && (
                    <div
                        style={{ marginLeft: 'auto' }}
                        ref={r.type === 'text' ? foliationPopupRef : undefined}>
                        <button
                            type="button"
                            style={{
                                background: '#fff',
                                color: '#000',
                                border: '1px solid #000',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: '0.75em',
                                userSelect: 'none',
                                fontWeight: 'bold',
                                padding: '10px 6px',
                                lineHeight: 1.2,
                                opacity: r.foliate ? 1 : 0.45,
                                minWidth: 62,
                            }}
                            title="Foliation"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (r.type === 'text') {
                                    if (!r.foliate) {
                                        preserveWindowScroll(() => updateRange(r.id, { foliate: true }));
                                        setFoliationPopupOpen(true);
                                    } else {
                                        setFoliationPopupOpen(v => !v);
                                    }
                                } else {
                                    preserveWindowScroll(() => updateRange(r.id, { foliate: !r.foliate }));
                                }
                            }}
                        >{r.foliate && (r.type === 'text' ? textFoliationPreview : fbFoliationPreview) ? (r.type === 'text' ? textFoliationPreview : fbFoliationPreview) : 'Foliation'}</button>
                        {/* Foliation popup for text ranges */}
                        {r.type === 'text' && foliationPopupOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '110%',
                                    right: 0,
                                    zIndex: 1000,
                                    background: '#fff',
                                    border: '1px solid #999',
                                    borderRadius: 6,
                                    padding: '8px 8px',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                                    minWidth: 0,
                                    width: 'max-content',
                                    fontSize: '0.82em',
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: '0.95em' }}>Foliation</div>
                                {/* ON/OFF toggle – top right */}
                                <span
                                    className="badge"
                                    style={{ position: 'absolute', top: 6, right: 8, backgroundColor: r.foliate ? '#dc3545' : '#aaa', color: '#fff', cursor: 'pointer', fontSize: '0.8em', userSelect: 'none' }}
                                    onClick={() => { preserveWindowScroll(() => updateRange(r.id, { foliate: !r.foliate })); if (r.foliate) setFoliationPopupOpen(false); }}
                                >{r.foliate ? 'OFF' : 'ON'}</span>
                                {r.foliate && (() => {
                                    const foliationOptions = [
                                        { value: FoliationType.FOLIATION_CONSECUTIVE, label: 'consecutive' },
                                        { value: FoliationType.FOLIATION_RECTOVERSO, label: 'recto/verso' },
                                        { value: FoliationType.FOLIATION_LEFTRIGHT, label: 'left/right' },
                                        { value: FoliationType.FOLIATION_AB, label: 'a/b' },
                                    ];
                                    const currentIdx = foliationOptions.findIndex(o => o.value === r.textFoliationType);
                                    const currentLabel = currentIdx >= 0 ? foliationOptions[currentIdx].label : foliationOptions[0].label;
                                    return (
                                        <div className="d-flex flex-column gap-2">
                                            {/* Foliation type + reverse toggle */}
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span
                                                    className="badge text-uppercase"
                                                    style={{ backgroundColor: '#555', color: '#fff', cursor: 'pointer', userSelect: 'none', minWidth: 70, textAlign: 'center', display: 'inline-block' }}
                                                    onClick={() => {
                                                        const nextIdx = (currentIdx + 1) % foliationOptions.length;
                                                        updateRange(r.id, { textFoliationType: foliationOptions[nextIdx].value });
                                                    }}
                                                    title="Click to change foliation type"
                                                >{currentLabel}</span>
                                                <span
                                                    className="badge text-uppercase"
                                                    style={{ backgroundColor: '#555', color: '#fff', cursor: 'pointer', userSelect: 'none', opacity: r.textFoliationReverse ? 1 : 0.45 }}
                                                    onClick={() => preserveWindowScroll(() => updateRange(r.id, { textFoliationReverse: !r.textFoliationReverse }))}
                                                >Reverse</span>
                                            </div>
                                            {/* Row 1: Start + Columns, Row 2: Prefix + Suffix */}
                                            <div className="d-flex flex-column gap-1">
                                                <div className="d-flex gap-2">
                                                    <div className="d-flex flex-column align-items-center">
                                                        <label className="small text-muted mb-1" style={{ whiteSpace: 'nowrap' }}>Start</label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            className="form-control form-control-sm rounded-2"
                                                            value={startInput}
                                                            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setStartInput(v); }}
                                                            onBlur={() => { const n = startInput === '' ? 1 : Math.max(1, Number(startInput)); updateRange(r.id, { textFoliationStart: n }); setStartInput(String(n)); }}
                                                            style={{ width: 60, textAlign: 'center' }}
                                                        />
                                                    </div>
                                                    <div className="d-flex flex-column align-items-center">
                                                        <label className="small text-muted mb-1" style={{ whiteSpace: 'nowrap' }} title="Columns per Page – Does not alter pages, which already have columns assigned!">Columns</label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            className="form-control form-control-sm rounded-2"
                                                            style={{ width: 60, textAlign: 'center' }}
                                                            value={colsInput}
                                                            onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setColsInput(v); }}
                                                            onBlur={() => { const n = colsInput === '' ? 1 : Math.max(1, Number(colsInput)); updateRange(r.id, { colsNumber: n, createCols: true }); setColsInput(String(n)); }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <div className="d-flex flex-column align-items-center">
                                                        <label className="small text-muted mb-1">Prefix</label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm rounded-2"
                                                            value={r.textFoliationPrefix}
                                                            onChange={(e) => updateRange(r.id, { textFoliationPrefix: e.target.value })}
                                                            style={{ width: 60, textAlign: 'center' }}
                                                        />
                                                    </div>
                                                    <div className="d-flex flex-column align-items-center">
                                                        <label className="small text-muted mb-1">Suffix</label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm rounded-2"
                                                            value={r.textFoliationSuffix}
                                                            onChange={(e) => updateRange(r.id, { textFoliationSuffix: e.target.value })}
                                                            style={{ width: 60, textAlign: 'center' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const PageItem = memo(
    function PageItem({ page, withThumbnail, thumbnailSize, isSelected, onClick, backgroundColor, liveFoliation }: PageItemProps) {

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

        // Selected state overrides range background color
        const bgColor = isSelected ? '#f0f8ff' : (backgroundColor || 'transparent');

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

                {withThumbnail ? thumbnail : ''}

                <div className={classes.join(' ')} style={textStyle}>
                    {page.foliation || page.sequence}
                    {liveFoliation && liveFoliation !== String(page.foliation) && (
                        <div style={{ fontStyle: 'italic', color: '#888', fontSize: '0.85em' }}>{liveFoliation}</div>
                    )}
                </div>
            </div>
        );
    });

function PageDefiner({ docId, numPages, urlGen, onDefineSuccess, onRangesChange, scrollToPage }: PageDefinerProps) {

    const [overwritePageTypes, setOverwritePageTypes] = useState(true);
    const [overwriteFoliation, setOverwriteFoliation] = useState(true);

    const [statusMsg, setStatusMsg] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const [ranges, setRanges] = useState<RangeConfig[]>([]);
    const [nextId, setNextId] = useState(1);
    // Currently focused range (highlighted with blue border)
    const [focusedRangeId, setFocusedRangeId] = useState<number | null>(null);

    // Preserves window scroll position to prevent layout jumps
    const preserveWindowScroll = (fn: () => void) => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        fn();
        // Restore scroll position after render
        setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' as any }), 0);
    };

    // Compute covered pages
    const coveredPages = React.useMemo(() => {
        const covered = new Set<number>();
        for (const r of ranges) {
            const pr = new PageRange(Math.max(1, r.from), Math.min(numPages, r.to), numPages);
            for (const p of pr.toArray()) {
                if (typeof p === 'number') covered.add(p);
            }
        }
        return covered;
    }, [ranges, numPages]);

    const isAllCovered = coveredPages.size === numPages;
    const anyAutoFB = ranges.some(r => r.type === 'text' && r.autoFrontBack);

    // Returns normalized from/to for a RangeConfig
    const normFromTo = (r: RangeConfig) => {
        const from = Math.max(1, Math.min(r.from, r.to));
        const to = Math.min(numPages, Math.max(r.from, r.to));
        return { from, to };
    };

    // Adjusts front/back ranges when a text range overlaps them.
    // Does NOT fill gaps – only corrects collisions.
    const syncFrontBack = useCallback((list: RangeConfig[]): RangeConfig[] => {
        const texts = list.filter(r => r.type === 'text');
        if (texts.length === 0) return list;

        // Compute min(text.from) and max(text.to) across all text ranges
        let minTextFrom = Infinity;
        let maxTextTo = -Infinity;
        for (const t of texts) {
            const normalizedFrom = Math.max(1, Math.min(t.from, t.to));
            const normalizedTo = Math.min(numPages, Math.max(t.from, t.to));
            if (normalizedFrom < minTextFrom) minTextFrom = normalizedFrom;
            if (normalizedTo > maxTextTo) maxTextTo = normalizedTo;
        }

        if (!Number.isFinite(minTextFrom) || !Number.isFinite(maxTextTo)) return list;

        let changed = false;
        const mapped = list.map(r => {
            if (r.type === 'front') {
                const normalizedTo = Math.min(numPages, Math.max(r.from, r.to));
                // Only adjust when text overlaps, not for gaps
                if (normalizedTo >= minTextFrom) {
                    const newTo = Math.max(1, minTextFrom - 1);
                    if (r.to !== newTo) {
                        changed = true;
                        return { ...r, to: newTo };
                    }
                }
            }
            if (r.type === 'back') {
                const normalizedFrom = Math.max(1, Math.min(r.from, r.to));
                // Only adjust when text overlaps, not for gaps
                if (normalizedFrom <= maxTextTo) {
                    const newFrom = Math.min(numPages, maxTextTo + 1);
                    if (r.from !== newFrom) {
                        changed = true;
                        return { ...r, from: newFrom };
                    }
                }
            }
            return r;
        });

        return changed ? mapped : list;
    }, [numPages]);

    // Adds a new range of the given type with smart initial values
    const addRangeOfType = (type: RangeType) => {
        if (anyAutoFB || isAllCovered) return;

        // Only one front and one back range allowed
        if ((type === 'front' && ranges.some(r => r.type === 'front')) ||
            (type === 'back' && ranges.some(r => r.type === 'back'))) {
            return;
        }

        // Highest covered page so far (for consecutive placement)
        let maxTo = 0;
        for (const r of ranges) {
            const { to } = normFromTo(r);
            if (to > maxTo) maxTo = to;
        }
        const nextStart = Math.min(numPages, Math.max(1, maxTo + 1));

        // Lowest from across all existing ranges
        let minOtherFrom: number | null = null;
        for (const r of ranges) {
            const { from } = normFromTo(r);
            minOtherFrom = minOtherFrom === null ? from : Math.min(minOtherFrom, from);
        }

        // Lowest from across all back ranges
        let minBackFrom: number | null = null;
        for (const r of ranges) {
            if (r.type === 'back') {
                const { from } = normFromTo(r);
                minBackFrom = minBackFrom === null ? from : Math.min(minBackFrom, from);
            }
        }

        let initFrom = nextStart;
        let initTo = numPages;
        const hasText = ranges.some(r => r.type === 'text');

        if (type === 'front') {
            if (!hasText) {
                // No text range yet: default front to pages 1–5
                initFrom = 1;
                initTo = Math.min(5, numPages);
            } else if (ranges.length > 0 && minOtherFrom !== null) {
                // Place front before all existing ranges
                initFrom = 1;
                initTo = Math.max(1, Math.min(numPages, minOtherFrom - 1));
                if (initTo < initFrom) initTo = 1; // fallback to 1..1
            } else {
                initFrom = 1;
                initTo = numPages;
            }
        } else if (type === 'text') {
            // Special defaults for the very first text range when no front/back exists:
            // default length is 10 pages
            const hasFrontMatter = ranges.some(r => r.type === 'front');
            const hasBackMatter = ranges.some(r => r.type === 'back');
            const hasAnyText = ranges.some(r => r.type === 'text');

            if (!hasAnyText && !hasFrontMatter && !hasBackMatter) {
                // First text range, no front/back present: default length 10
                initFrom = 1;
                initTo = Math.min(numPages, initFrom + 9);
            } else if (!hasAnyText && hasFrontMatter && !hasBackMatter) {
                // Front exists but no text or back yet: default length 10
                initFrom = nextStart;
                initTo = Math.min(numPages, initFrom + 9);
            } else if (minBackFrom !== null) {
                // Text must end before back range starts
                const limitTo = Math.max(1, Math.min(numPages, minBackFrom - 1));
                initFrom = Math.min(nextStart, limitTo);
                initTo = limitTo;
                if (initFrom > initTo) initFrom = initTo; // fallback to single page
                if (initFrom < 1) initFrom = 1;
            } else {
                // Default: consecutive after last range, length 10
                initFrom = nextStart;
                initTo = Math.min(numPages, initFrom + 9);
            }
        } else if (type === 'back') {
            // Back range may only be added if the last page is not yet covered
            const lastCovered = ranges.some(r => {
                const to = Math.min(numPages, Math.max(r.from, r.to));
                return to === numPages;
            });
            if (lastCovered) {
                return; // Last page already covered – skip
            }
            // Default: consecutive after last range to end
            initFrom = nextStart;
            initTo = numPages;
        }

        const newId = nextId;
        setRanges(prev => ([
            ...prev,
            {
                id: newId,
                from: initFrom,
                to: initTo,
                type,
                foliate: false,
                textFoliationType: FoliationType.FOLIATION_RECTOVERSO,
                textFoliationStart: 1,
                textFoliationPrefix: '',
                textFoliationSuffix: '',
                textFoliationReverse: false,
                autoFrontBack: false,
                foliateFrontBack: false,
                createCols: false,
                colsNumber: 1
            }
        ]));
        setNextId(id => id + 1);
        // Focus the newly added range immediately
        setFocusedRangeId(newId);
    };

    const updateRange = (id: number, patch: Partial<RangeConfig>) => {
        setRanges(prev => {
            // Apply patch to the target range
            let updated = prev.map(r => r.id === id ? { ...r, ...patch } : r);

            const changed = updated.find(r => r.id === id);
            if (!changed) return updated;

            // Ensure from <= to
            if (changed.from > changed.to) {
                [changed.from, changed.to] = [changed.to, changed.from];
            }

            // Normalized bounds of the changed range
            const normalizedFrom = Math.max(1, Math.min(changed.from, changed.to));
            const normalizedTo = Math.min(numPages, Math.max(changed.from, changed.to));

            // 1. Auto-create front/back ranges when autoFrontBack is enabled on a text range
            if (changed.type === 'text' && typeof patch.autoFrontBack !== 'undefined' && patch.autoFrontBack) {
                const hasFront = updated.some(r => r.type === 'front');
                const hasBack = updated.some(r => r.type === 'back');
                let maxId = updated.reduce((m, r) => Math.max(m, r.id), 0);
                const newRanges: RangeConfig[] = [];
                if (!hasFront && normalizedFrom > 1) {
                    newRanges.push({
                        id: ++maxId,
                        type: 'front',
                        from: 1,
                        to: Math.max(1, normalizedFrom - 1),
                        foliate: false,
                        textFoliationType: FoliationType.FOLIATION_RECTOVERSO,
                        textFoliationStart: 1,
                        textFoliationPrefix: '',
                        textFoliationSuffix: '',
                        textFoliationReverse: false,
                        autoFrontBack: false,
                        foliateFrontBack: false,
                        createCols: false,
                        colsNumber: 1
                    });
                }
                if (!hasBack && normalizedTo < numPages) {
                    newRanges.push({
                        id: ++maxId,
                        type: 'back',
                        from: Math.min(numPages, normalizedTo + 1),
                        to: numPages,
                        foliate: false,
                        textFoliationType: FoliationType.FOLIATION_RECTOVERSO,
                        textFoliationStart: 1,
                        textFoliationPrefix: '',
                        textFoliationSuffix: '',
                        textFoliationReverse: false,
                        autoFrontBack: false,
                        foliateFrontBack: false,
                        createCols: false,
                        colsNumber: 1
                    });
                }
                if (newRanges.length > 0) {
                    updated = [...updated, ...newRanges];
                }
            }

            // 1.5 Prevent overlaps – adjust all other ranges when from/to changes
            if (typeof patch.from !== 'undefined' || typeof patch.to !== 'undefined') {
                updated = updated.flatMap(r => {
                    if (r.id === changed.id) return [r];
                    const otherFrom = Math.max(1, Math.min(r.from, r.to));
                    const otherTo = Math.min(numPages, Math.max(r.from, r.to));

                    // Changed range fully contains other → remove the other range
                    if (normalizedFrom <= otherFrom && normalizedTo >= otherTo) {
                        return [];
                    }
                    // Changed range.from falls inside other → shrink other.to
                    if (normalizedFrom > otherFrom && normalizedFrom <= otherTo) {
                        return [{ ...r, to: Math.max(otherFrom, normalizedFrom - 1) }];
                    }
                    // Changed range.to falls inside other → push other.from forward
                    if (normalizedTo >= otherFrom && normalizedTo < otherTo) {
                        return [{ ...r, from: Math.min(otherTo, normalizedTo + 1) }];
                    }
                    return [r];
                });
            }

            // 2. Resolve collisions automatically
            // Front: if 'to' reaches or exceeds text.from → push text.from to front.to + 1
            if (changed.type === 'front' && typeof patch.to !== 'undefined') {
                let textRanges = updated.filter(r => r.type === 'text');
                if (textRanges.length > 0) {
                    // Pick the text range with the smallest from
                    let target = textRanges.reduce((a, b) => (Math.min(a.from, a.to) <= Math.min(b.from, b.to) ? a : b));
                    const trFrom = Math.max(1, Math.min(target.from, target.to));
                    if (normalizedTo >= trFrom) {
                        const newFrom = Math.min(numPages, normalizedTo + 1);
                        updated = updated.map(r => r.id === target.id ? { ...r, from: Math.min(newFrom, Math.max(r.from, r.to)), to: Math.max(r.from, r.to) } : r);
                    }
                }
            }

            // Back: if 'from' reaches or goes below text.to → shrink text.to to back.from - 1
            if (changed.type === 'back' && typeof patch.from !== 'undefined') {
                const newBackFrom = normalizedFrom;
                let candidates = updated.filter(r => r.type === 'text');
                if (candidates.length > 0) {
                    // Pick the text range with the largest to
                    let target = candidates.reduce((a, b) => (Math.max(a.from, a.to) >= Math.max(b.from, b.to) ? a : b));
                    const trTo = Math.min(numPages, Math.max(target.from, target.to));
                    if (newBackFrom <= trTo) {
                        const newTo = Math.max(1, newBackFrom - 1);
                        updated = updated.map(r => r.id === target.id ? { ...r, to: Math.max(Math.min(newTo, Math.max(r.from, r.to)), Math.min(r.from, r.to)) } : r);
                    }
                }
            }

            // Sync front/back bounds to text ranges whenever a text range changes
            if (changed.type === 'text') {
                updated = syncFrontBack(updated);
            }

            return updated;
        });
    };

    const removeRange = (id: number) => {
        setRanges(prev => prev.filter(r => r.id !== id));
    };

    // Handles the Define button click
    const handleSubmit = async () => {
        if (isUpdating) return;

        setIsUpdating(true);
        setStatusMsg("Updating, please wait...");

        const pageDefinitions: PageDefinition[] = [];

        // Pushes page definitions from a PageRange with optional type and foliation
        const pushRange = (
            pr: PageRange,
            opts: {
                pageType?: number,
                foliate?: boolean,
                foliationType?: number,
                start?: number,
                prefix?: string,
                suffix?: string,
                reverse?: boolean
            }
        ) => {
            for (const page of pr.toArray()) {
                if (typeof page !== 'number') continue;
                const pageDefinition: PageDefinition = { docId, page };
                if (overwritePageTypes && typeof opts.pageType !== 'undefined') pageDefinition.type = opts.pageType;
                if (opts.foliate) {
                    pageDefinition.foliation = pr.foliate(
                        page,
                        opts.foliationType ?? FoliationType.FOLIATION_CONSECUTIVE,
                        opts.start ?? 1,
                        (opts.prefix ?? '').replace(/\s+/g, ''),
                        (opts.suffix ?? '').replace(/\s+/g, ''),
                        opts.reverse ?? false
                    );
                    pageDefinition.overwriteFoliation = overwriteFoliation;
                } else if (overwriteFoliation) {
                    pageDefinition.foliation = String(page);
                    pageDefinition.overwriteFoliation = true;
                }
                pageDefinitions.push(pageDefinition);
            }
        };

        // Process all ranges (auto front/back is represented as real front/back ranges)
        for (const r of ranges) {
            const from = Math.max(1, Math.min(r.from, r.to));
            const to = Math.min(numPages, Math.max(r.from, r.to));
            const pr = new PageRange(from, to, numPages);
            if (r.type === 'text') {
                pushRange(pr, {
                    pageType: Entity.PageTypeText,
                    foliate: r.foliate && !r.autoFrontBack, // text foliation options are ignored when autoFrontBack is active
                    foliationType: r.textFoliationType,
                    start: r.textFoliationStart,
                    prefix: r.textFoliationPrefix,
                    suffix: r.textFoliationSuffix,
                    reverse: r.textFoliationReverse
                });
            } else if (r.type === 'front') {
                pushRange(pr, {
                    pageType: Entity.PageTypeFrontMatter,
                    foliate: r.foliate,
                    foliationType: FoliationType.FOLIATION_CONSECUTIVE,
                    start: 1,
                    prefix: 'x'
                });
            } else if (r.type === 'back') {
                const frontRange = ranges.find(rx => rx.type === 'front');
                let backStart = 1;
                if (frontRange) {
                    const frontFrom = Math.max(1, Math.min(frontRange.from, frontRange.to));
                    const frontTo = Math.min(numPages, Math.max(frontRange.from, frontRange.to));
                    backStart = new PageRange(frontFrom, frontTo, numPages).toArray().length + 1;
                }
                pushRange(pr, {
                    pageType: Entity.PageTypeBackMatter,
                    foliate: r.foliate,
                    foliationType: FoliationType.FOLIATION_CONSECUTIVE,
                    start: backStart,
                    prefix: 'x'
                });
            }
        }

        try {
            const apiUrl = urlGen?.apiBulkPageSettings();
            if (!apiUrl) {
                throw new Error('Missing API URL generator');
            }
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ data: JSON.stringify(pageDefinitions) }).toString(),
            });
            if (!response.ok) throw new Error("Network response was not ok");
            setStatusMsg("Defined!");
            setTimeout(() => setStatusMsg(''), 1000);
            setRanges([]);
            onRangesChange?.([]);
            setFocusedRangeId(null);
            onDefineSuccess?.();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setStatusMsg("Update failed: " + message);
        } finally {
            setIsUpdating(false);
        }
    };

    // Keep front/back ranges aligned with text ranges when the page count changes.
    useEffect(() => {
        setRanges(prev => syncFrontBack(prev));
    }, [syncFrontBack]);

    // Notify parent when ranges change
    useEffect(() => {
        onRangesChange?.(ranges);
    }, [ranges, onRangesChange]);

    return (
        <div className="page-definer" style={{ fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #ccc', color: '#333' }}>
                <span className="text-uppercase text-muted small fw-bold me-3">Page Definer</span>
            </div>

            {/* Range list in creation order */}
            <div>
                {React.useMemo(() => {
                    return ranges.map((r) => (
                        <RangeEditor
                            key={r.id}
                            r={r}
                            numPages={numPages}
                            updateRange={updateRange}
                            removeRange={removeRange}
                            focusedRangeId={focusedRangeId}
                            setFocusedRangeId={setFocusedRangeId}
                            ranges={ranges}
                            preserveWindowScroll={preserveWindowScroll}
                            scrollToPage={scrollToPage}
                        />
                    ));
                }, [ranges, numPages, focusedRangeId])}
            </div>

            {/* New Range button – always visible below the range list */}
            <div className="mb-1 d-flex justify-content-center">
                <button className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                            const hasFront = ranges.some(r => r.type === 'front');
                            const hasText = ranges.some(r => r.type === 'text');
                            const hasBack = ranges.some(r => r.type === 'back');
                            // Default to back only when front+text exist and ≤4 pages at the end are uncovered
                            const coveredPages = new Set<number>();
                            for (const r of ranges) {
                                const f = Math.min(r.from, r.to);
                                const t = Math.max(r.from, r.to);
                                for (let p = f; p <= t; p++) coveredPages.add(p);
                            }
                            const uncoveredAtEnd = (() => {
                                let count = 0;
                                for (let p = numPages; p >= 1; p--) {
                                    if (!coveredPages.has(p)) count++;
                                    else break;
                                }
                                return count;
                            })();
                            let defaultType: RangeType;
                            if (ranges.length === 0) {
                                defaultType = 'front';
                            } else if (hasFront && hasText && !hasBack && uncoveredAtEnd < 5) {
                                defaultType = 'back';
                            } else {
                                defaultType = 'text';
                            }
                            addRangeOfType(defaultType);
                        }}
                        disabled={anyAutoFB || isAllCovered}
                        style={{ fontSize: '0.85em', padding: '4px 16px', width: '100%' }}
                >New Range</button>
            </div>
            {anyAutoFB && <div className="text-center text-muted small mb-2">Adding more ranges is disabled while automatic Front/Back is selected.</div>}
            {isAllCovered && <div className="text-center text-muted small mb-2">All pages are already covered by ranges.</div>}

            {/* Global options and action – shown only when at least one range exists */}
            {ranges.length > 0 && (
                <>
                    {/* Divider after the last range */}
                    <hr className="mt-2 mb-1" style={{ borderTop: '1px solid #000000' }} />
                    <div className="d-flex justify-content-end align-items-center mb-2 flex-wrap">
                        <button
                            className="btn btn-sm btn-success text-center"
                            onClick={handleSubmit}
                            disabled={isUpdating}
                            style={{ padding: '2px 16px', width: '100%' }}
                        >
                            Define
                        </button>
                    </div>
                </>
            )}

            <p>{statusMsg}</p>
        </div>
    );
}
