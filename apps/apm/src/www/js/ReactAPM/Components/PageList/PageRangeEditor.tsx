import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageRange } from '@/PageRange';
import * as FoliationType from '../../../constants/FoliationType';
import PageKnob from '@/ReactAPM/Components/PageList/PageKnob';
import { Range, RangeType } from '@/ReactAPM/Components/PageList/PageListTypes';

interface RangeEditorProps {
    range: Range;
    numPages: number;
    ranges: Range[];
    updateRange: (id: number, patch: Partial<Range>) => void;
    removeRange: (id: number) => void;
    focusedRangeId: number | null;
    setFocusedRangeId: (id: number | null) => void;
    preserveWindowScroll: (fn: () => void) => void;
    scrollToPage?: (pageNum: number) => void;
    onColsInputChange?: (rangeId: number, value: string) => void;
}

export default function PageRangeEditor({
    range,
    numPages,
    ranges,
    updateRange,
    removeRange,
    focusedRangeId,
    setFocusedRangeId,
    preserveWindowScroll,
    scrollToPage,
    onColsInputChange
}: RangeEditorProps) {
    const [foliationPopupOpen, setFoliationPopupOpen] = useState(false);
    const [startInput, setStartInput] = useState<string>(String(range.foliationStart ?? 1));
    const [colsInput, setColsInput] = useState<string>(range.numCols && range.numCols > 1 ? String(range.numCols) : '');
    const foliationPopupRef = useRef<HTMLDivElement>(null);

    useEffect(() => setStartInput(String(range.foliationStart ?? 1)), [range.foliationStart]);
    useEffect(() => setColsInput(range.numCols && range.numCols > 1 ? String(range.numCols) : ''), [range.numCols]);

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

    const handleFromChange = useCallback((val: number) => {
        updateRange(range.id, { from: val });
        scrollToPage?.(val);
    }, [range.id, updateRange, scrollToPage]);

    const handleToChange = useCallback((val: number) => {
        updateRange(range.id, { to: val });
        scrollToPage?.(val);
    }, [range.id, updateRange, scrollToPage]);

    const pr = new PageRange(
        Math.max(1, Math.min(range.from, range.to)),
        Math.min(numPages, Math.max(range.from, range.to)),
        numPages
    );

    const textFoliationPreview = range.type === 'text' && range.foliate
        ? pr.toStringWithFoliation('', ' - ', '', range.foliationType!, range.foliationStart!, (range.foliationPrefix || '').replace(/\s+/g, ''), (range.foliationSuffix || '').replace(/\s+/g, ''), !!range.foliationReverse)
        : '';

    const fbFoliationStart = useMemo(() => {
        if (range.type === 'front') return 1;
        if (range.type === 'back') {
            const frontRange = ranges.find(rx => rx.type === 'front');
            if (!frontRange) return 1;
            const fpr = new PageRange(
                Math.max(1, Math.min(frontRange.from, frontRange.to)),
                Math.min(numPages, Math.max(frontRange.from, frontRange.to)),
                numPages
            );
            return fpr.toArray().length + 1;
        }
        return 1;
    }, [range.type, ranges, numPages]);

    const fbFoliationPreview = range.foliate && (range.type === 'front' || range.type === 'back')
        ? pr.toStringWithFoliation('', ' - ', '', FoliationType.FOLIATION_CONSECUTIVE, fbFoliationStart, 'x')
        : '';

    const isFocused = focusedRangeId === range.id;
    const textRangeColors = ['#b8d4eb', '#d4b8eb', '#b8ebd4'];
    let cardBgColor = 'transparent';
    if (range.type === 'text') {
        const textRanges = ranges.filter(rx => rx.type === 'text').sort((a, b) => Math.max(1, Math.min(a.from, a.to)) - Math.max(1, Math.min(b.from, b.to)));
        const idx = textRanges.findIndex(rx => rx.id === range.id);
        cardBgColor = textRangeColors[idx % textRangeColors.length];
    } else if (range.type === 'front' || range.type === 'back') {
        cardBgColor = '#d0d0d0';
    }

    return (
        <div
            className="card mb-2"
            onClick={() => setFocusedRangeId(range.id)}
            onFocusCapture={() => setFocusedRangeId(range.id)}
            onBlurCapture={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusedRangeId(null);
            }}
            style={{
                padding: '4px 8px 4px 8px',
                border: `1px solid ${isFocused ? '#0d6efd' : '#999'}`,
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
                        const hasFront = ranges.some(x => x.id !== range.id && x.type === 'front');
                        const hasBack = ranges.some(x => x.id !== range.id && x.type === 'back');
                        const types: RangeType[] = ['front', 'text', 'back'].filter(t => (t !== 'front' || !hasFront || range.type === 'front'))
                            .filter(t => (t !== 'back' || !hasBack || range.type === 'back')) as RangeType[];
                        const currentIdx = types.indexOf(range.type);
                        const nextIdx = (currentIdx + 1) % types.length;
                        updateRange(range.id, { type: types[nextIdx] });
                    }}
                    title="Click to change type"
                >{range.type}</span>
                <button className="btn btn-sm" onClick={() => removeRange(range.id)} style={{ lineHeight: 1, padding: '1px 5px', fontSize: '0.85em', border: 'none', background: 'none', color: '#555', alignSelf: 'flex-end' }}>×</button>
            </div>
            <div className="d-flex align-items-center gap-1" style={{ marginBottom: 2, marginTop: 6 }}>
                <div className="d-flex align-items-center justify-content-center gap-2">
                    <PageKnob value={range.from} onChange={handleFromChange} min={1} max={numPages} />
                    <label className="me-1">–</label>
                    <PageKnob value={range.to} onChange={handleToChange} min={1} max={numPages} />
                </div>
                <div style={{ marginLeft: 'auto' }} ref={range.type === 'text' ? foliationPopupRef : undefined}>
                        <button
                            type="button"
                            style={{ background: '#fff', color: '#000', border: '1px solid #000', borderRadius: 4, cursor: 'pointer', fontSize: '0.75em', userSelect: 'none', fontWeight: 'bold', padding: '10px 6px', lineHeight: 1.2, opacity: range.foliate ? 1 : 0.45, minWidth: 62 }}
                            title="Foliation"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (range.type === 'text') {
                                    if (!range.foliate) {
                                        preserveWindowScroll(() => updateRange(range.id, { foliate: true }));
                                        setFoliationPopupOpen(true);
                                    } else {
                                        setFoliationPopupOpen(v => !v);
                                    }
                                } else {
                                    preserveWindowScroll(() => updateRange(range.id, { foliate: !range.foliate }));
                                }
                            }}
                        >
                            {range.foliate && (range.type === 'text' ? textFoliationPreview : fbFoliationPreview) ? (range.type === 'text' ? textFoliationPreview : fbFoliationPreview) : 'Foliation'}
                        </button>
                        {range.type === 'text' && foliationPopupOpen ? (
                            <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 1000, background: '#fff', border: '1px solid #999', borderRadius: 6, padding: '8px 8px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', minWidth: 0, width: 'max-content', fontSize: '0.82em' }} onClick={e => e.stopPropagation()}>
                                <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: '0.95em' }}>Foliation</div>
                                <span className="badge" style={{ position: 'absolute', top: 6, right: 8, backgroundColor: range.foliate ? '#dc3545' : '#aaa', color: '#fff', cursor: 'pointer', fontSize: '0.8em', userSelect: 'none' }} onClick={() => { preserveWindowScroll(() => updateRange(range.id, { foliate: !range.foliate })); if (range.foliate) setFoliationPopupOpen(false); }}>{range.foliate ? 'OFF' : 'ON'}</span>
                                {range.foliate ? (
                                    <div className="d-flex flex-column gap-2">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span
                                                className="badge text-uppercase"
                                                style={{ backgroundColor: '#555', color: '#fff', cursor: 'pointer', userSelect: 'none', minWidth: 70, textAlign: 'center', display: 'inline-block' }}
                                                onClick={() => {
                                                    const foliationOptions = [
                                                        { value: FoliationType.FOLIATION_CONSECUTIVE, label: 'consecutive' },
                                                        { value: FoliationType.FOLIATION_RECTOVERSO, label: 'recto/verso' },
                                                        { value: FoliationType.FOLIATION_LEFTRIGHT, label: 'left/right' },
                                                        { value: FoliationType.FOLIATION_AB, label: 'a/b' },
                                                    ];
                                                    const currentIdx = foliationOptions.findIndex(o => o.value === range.foliationType);
                                                    const nextIdx = (currentIdx + 1) % foliationOptions.length;
                                                    updateRange(range.id, { foliationType: foliationOptions[nextIdx].value });
                                                }}
                                                title="Click to change foliation type"
                                            >
                                                {[
                                                    { value: FoliationType.FOLIATION_CONSECUTIVE, label: 'consecutive' },
                                                    { value: FoliationType.FOLIATION_RECTOVERSO, label: 'recto/verso' },
                                                    { value: FoliationType.FOLIATION_LEFTRIGHT, label: 'left/right' },
                                                    { value: FoliationType.FOLIATION_AB, label: 'a/b' }
                                                ].find(o => o.value === range.foliationType)?.label ?? 'consecutive'}
                                            </span>
                                            <span className="badge text-uppercase" style={{ backgroundColor: '#555', color: '#fff', cursor: 'pointer', userSelect: 'none', opacity: range.foliationReverse ? 1 : 0.45 }} onClick={() => preserveWindowScroll(() => updateRange(range.id, { foliationReverse: !range.foliationReverse }))}>Reverse</span>
                                        </div>
                                        <div className="d-flex flex-column gap-1">
                                            <div className="d-flex gap-2">
                                                <div className="d-flex flex-column align-items-center">
                                                    <label className="small text-muted mb-1" style={{ whiteSpace: 'nowrap' }}>Start</label>
                                                    <input type="text" inputMode="numeric" className="form-control form-control-sm rounded-2" value={startInput} onChange={(e) => setStartInput(e.target.value.replace(/[^0-9]/g, ''))} onBlur={() => { const n = startInput === '' ? 1 : Math.max(1, Number(startInput)); updateRange(range.id, { foliationStart: n }); setStartInput(String(n)); }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} style={{ width: 60, textAlign: 'center' }} />
                                                </div>
                                                <div className="d-flex flex-column align-items-center">
                                                    <label className="small text-muted mb-1" style={{ whiteSpace: 'nowrap' }} title="Columns per Page – cannot reduce the number of columns already assigned to a page.">Columns</label>
                                                    <input type="text" inputMode="numeric" className="form-control form-control-sm rounded-2" style={{ width: 60, textAlign: 'center' }} value={colsInput} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setColsInput(v); onColsInputChange?.(range.id, v); }} onBlur={() => { const n = colsInput === '' ? 1 : Math.max(1, Number(colsInput)); updateRange(range.id, { numCols: n }); setColsInput(String(n)); }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                                                </div>
                                            </div>
                                            <div className="d-flex gap-2">
                                                <div className="d-flex flex-column align-items-center">
                                                    <label className="small text-muted mb-1">Prefix</label>
                                                    <input type="text" className="form-control form-control-sm rounded-2" value={range.foliationPrefix} onChange={(e) => updateRange(range.id, { foliationPrefix: e.target.value })} style={{ width: 60, textAlign: 'center' }} />
                                                </div>
                                                <div className="d-flex flex-column align-items-center">
                                                    <label className="small text-muted mb-1">Suffix</label>
                                                    <input type="text" className="form-control form-control-sm rounded-2" value={range.foliationSuffix} onChange={(e) => updateRange(range.id, { foliationSuffix: e.target.value })} style={{ width: 60, textAlign: 'center' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                </div>
            </div>
        </div>
    );
}
