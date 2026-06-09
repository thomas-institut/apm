import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PageRange } from '@/PageRange';
import * as FoliationType from '../../../constants/FoliationType';
import * as Entity from '../../../constants/Entity';
import { AppContext } from '@/ReactAPM/App';
import PageRangeEditor from '@/ReactAPM/Components/PageList/PageRangeEditor';
import { PageDefinition, PageDefinerProps, Range, RangeType } from '@/ReactAPM/Components/PageList/PageListTypes';

export default function PageDefiner({ docId, numPages, onDefineSuccess, onRangesChange, onColsInputChange, scrollToPage }: PageDefinerProps) {
    const appContext = useContext(AppContext);
    const [statusMsg, setStatusMsg] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [overwritePageTypes] = useState(true);
    const [ranges, setRanges] = useState<Range[]>([]);
    const [nextId, setNextId] = useState(1);
    const [focusedRangeId, setFocusedRangeId] = useState<number | null>(null);

    const preserveWindowScroll = (fn: () => void) => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        fn();
        setTimeout(() => window.scrollTo(0, y), 0);
    };

    const coveredPages = useMemo(() => {
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

    const normFromTo = (r: Range) => ({
        from: Math.max(1, Math.min(r.from, r.to)),
        to: Math.min(numPages, Math.max(r.from, r.to))
    });

    const syncFrontBack = useCallback((list: Range[]): Range[] => {
        const texts = list.filter(r => r.type === 'text');
        if (texts.length === 0) return list;
        let minTextFrom = Infinity;
        let maxTextTo = -Infinity;
        for (const t of texts) {
            const normalizedFrom = Math.max(1, Math.min(t.from, t.to));
            const normalizedTo = Math.min(numPages, Math.max(t.from, t.to));
            minTextFrom = Math.min(minTextFrom, normalizedFrom);
            maxTextTo = Math.max(maxTextTo, normalizedTo);
        }
        if (!Number.isFinite(minTextFrom) || !Number.isFinite(maxTextTo)) return list;
        let changed = false;
        const mapped = list.map(r => {
            if (r.type === 'front') {
                const normalizedTo = Math.min(numPages, Math.max(r.from, r.to));
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

    const addRangeOfType = (type: RangeType) => {
        if (isAllCovered) return;
        if ((type === 'front' && ranges.some(r => r.type === 'front')) || (type === 'back' && ranges.some(r => r.type === 'back'))) return;
        let maxTo = 0;
        for (const r of ranges) maxTo = Math.max(maxTo, normFromTo(r).to);
        const nextStart = Math.min(numPages, Math.max(1, maxTo + 1));
        let minOtherFrom: number | null = null;
        let minBackFrom: number | null = null;
        for (const r of ranges) {
            const from = normFromTo(r).from;
            minOtherFrom = minOtherFrom === null ? from : Math.min(minOtherFrom, from);
            if (r.type === 'back') minBackFrom = minBackFrom === null ? from : Math.min(minBackFrom, from);
        }

        let initFrom = nextStart;
        let initTo = numPages;
        const hasText = ranges.some(r => r.type === 'text');
        if (type === 'front') {
            if (!hasText) {
                initFrom = 1;
                initTo = Math.min(5, numPages);
            } else if (ranges.length > 0 && minOtherFrom !== null) {
                initFrom = 1;
                initTo = Math.max(1, Math.min(numPages, minOtherFrom - 1));
            } else {
                initFrom = 1;
                initTo = numPages;
            }
        } else if (type === 'text') {
            const hasFrontMatter = ranges.some(r => r.type === 'front');
            const hasBackMatter = ranges.some(r => r.type === 'back');
            const hasAnyText = ranges.some(r => r.type === 'text');
            if (!hasAnyText && !hasFrontMatter && !hasBackMatter) {
                initFrom = 1;
                initTo = Math.min(numPages, initFrom + 9);
            } else if (!hasAnyText && hasFrontMatter && !hasBackMatter) {
                initFrom = nextStart;
                initTo = Math.min(numPages, initFrom + 9);
            } else if (minBackFrom !== null) {
                const limitTo = Math.max(1, Math.min(numPages, minBackFrom - 1));
                initFrom = Math.min(nextStart, limitTo);
                initTo = limitTo;
                if (initFrom > initTo) initFrom = initTo;
                if (initFrom < 1) initFrom = 1;
            } else {
                initFrom = nextStart;
                initTo = Math.min(numPages, initFrom + 9);
            }
        } else {
            const lastCovered = ranges.some(r => Math.min(numPages, Math.max(r.from, r.to)) === numPages);
            if (lastCovered) return;
            initFrom = nextStart;
            initTo = numPages;
        }

        const newId = nextId;
        setRanges(prev => [...prev, {
            id: newId,
            from: initFrom,
            to: initTo,
            type,
            foliate: false,
            foliationType: FoliationType.FOLIATION_CONSECUTIVE,
            foliationStart: 1,
            foliationPrefix: '',
            foliationSuffix: '',
            foliationReverse: false,
            numCols: 1
        }]);
        setNextId(id => id + 1);
        setFocusedRangeId(newId);
    };

    const updateRange = (id: number, patch: Partial<Range>) => {
        setRanges(prev => {
            let updated = prev.map(r => r.id === id ? { ...r, ...patch } : r);
            const changed = updated.find(r => r.id === id);
            if (!changed) return updated;
            if (changed.from > changed.to) [changed.from, changed.to] = [changed.to, changed.from];
            const normalizedFrom = Math.max(1, Math.min(changed.from, changed.to));
            const normalizedTo = Math.min(numPages, Math.max(changed.from, changed.to));
            if (typeof patch.from !== 'undefined' || typeof patch.to !== 'undefined') {
                updated = updated.flatMap(r => {
                    if (r.id === changed.id) return [r];
                    const otherFrom = Math.max(1, Math.min(r.from, r.to));
                    const otherTo = Math.min(numPages, Math.max(r.from, r.to));
                    if (normalizedFrom <= otherFrom && normalizedTo >= otherTo) return [];
                    if (normalizedFrom > otherFrom && normalizedFrom <= otherTo) return [{ ...r, to: Math.max(otherFrom, normalizedFrom - 1) }];
                    if (normalizedTo >= otherFrom && normalizedTo < otherTo) return [{ ...r, from: Math.min(otherTo, normalizedTo + 1) }];
                    return [r];
                });
            }
            if (changed.type === 'front' && typeof patch.to !== 'undefined') {
                const textRanges = updated.filter(r => r.type === 'text');
                if (textRanges.length > 0) {
                    const target = textRanges.reduce((a, b) => (Math.min(a.from, a.to) <= Math.min(b.from, b.to) ? a : b));
                    const trFrom = Math.max(1, Math.min(target.from, target.to));
                    if (normalizedTo >= trFrom) {
                        const newFrom = Math.min(numPages, normalizedTo + 1);
                        updated = updated.map(r => r.id === target.id ? { ...r, from: Math.min(newFrom, Math.max(r.from, r.to)), to: Math.max(r.from, r.to) } : r);
                    }
                }
            }
            if (changed.type === 'back' && typeof patch.from !== 'undefined') {
                const candidates = updated.filter(r => r.type === 'text');
                if (candidates.length > 0) {
                    const target = candidates.reduce((a, b) => (Math.max(a.from, a.to) >= Math.max(b.from, b.to) ? a : b));
                    const trTo = Math.min(numPages, Math.max(target.from, target.to));
                    if (normalizedFrom <= trTo) {
                        const newTo = Math.max(1, normalizedFrom - 1);
                        updated = updated.map(r => r.id === target.id ? { ...r, to: Math.max(Math.min(newTo, Math.max(r.from, r.to)), Math.min(r.from, r.to)) } : r);
                    }
                }
            }
            if (changed.type === 'text') updated = syncFrontBack(updated);
            return updated;
        });
    };

    const removeRange = (id: number) => setRanges(prev => prev.filter(r => r.id !== id));

    const handleSubmit = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        setStatusMsg('Updating, please wait...');
        const pageDefinitions: PageDefinition[] = [];
        const pushRange = (pr: PageRange, opts: { pageType?: number; foliate?: boolean; foliationType?: number; start?: number; prefix?: string; suffix?: string; reverse?: boolean; numCols?: number }) => {
            for (const page of pr.toArray()) {
                if (typeof page !== 'number') continue;
                const pageDefinition: PageDefinition = { docId, page };
                if (overwritePageTypes && typeof opts.pageType !== 'undefined') pageDefinition.type = opts.pageType;
                pageDefinition.foliation = opts.foliate ? pr.foliate(page, opts.foliationType ?? FoliationType.FOLIATION_CONSECUTIVE, opts.start ?? 1, (opts.prefix ?? '').replace(/\s+/g, ''), (opts.suffix ?? '').replace(/\s+/g, ''), opts.reverse ?? false) : String(page);
                pageDefinition.overwriteFoliation = true;
                if (opts.numCols && opts.numCols > 1) pageDefinition.cols = opts.numCols;
                pageDefinitions.push(pageDefinition);
            }
        };

        for (const r of ranges) {
            const from = Math.max(1, Math.min(r.from, r.to));
            const to = Math.min(numPages, Math.max(r.from, r.to));
            const pr = new PageRange(from, to, numPages);
            if (r.type === 'text') {
                pushRange(pr, { pageType: Entity.PageTypeText, foliate: r.foliate, foliationType: r.foliationType, start: r.foliationStart, prefix: r.foliationPrefix, suffix: r.foliationSuffix, reverse: r.foliationReverse, numCols: r.numCols });
            } else if (r.type === 'front') {
                pushRange(pr, { pageType: Entity.PageTypeFrontMatter, foliate: r.foliate, foliationType: FoliationType.FOLIATION_CONSECUTIVE, start: 1, prefix: 'x', numCols: r.numCols });
            } else {
                const frontRange = ranges.find(rx => rx.type === 'front');
                let backStart = 1;
                if (frontRange) {
                    const frontFrom = Math.max(1, Math.min(frontRange.from, frontRange.to));
                    const frontTo = Math.min(numPages, Math.max(frontRange.from, frontRange.to));
                    backStart = new PageRange(frontFrom, frontTo, numPages).toArray().length + 1;
                }
                pushRange(pr, { pageType: Entity.PageTypeBackMatter, foliate: r.foliate, foliationType: FoliationType.FOLIATION_CONSECUTIVE, start: backStart, prefix: 'x', numCols: r.numCols });
            }
        }

        try {
            await appContext.apiClient.bulkSavePageSettings(pageDefinitions);
            setStatusMsg('Defined!');
            setTimeout(() => setStatusMsg(''), 1000);
            setRanges([]);
            onRangesChange?.([]);
            setFocusedRangeId(null);
            onDefineSuccess?.();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setStatusMsg(`Update failed: ${message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    useEffect(() => setRanges(prev => syncFrontBack(prev)), [syncFrontBack]);
    useEffect(() => onRangesChange?.(ranges), [ranges, onRangesChange]);

    return (
        <div className="page-definer" style={{ fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #ccc', color: '#333' }}>
                <span className="text-uppercase text-muted small fw-bold me-3">Page Definer</span>
            </div>
            <div>
                {ranges.map(r => (
                    <PageRangeEditor key={r.id} range={r} numPages={numPages} ranges={ranges} updateRange={updateRange} removeRange={removeRange} focusedRangeId={focusedRangeId} setFocusedRangeId={setFocusedRangeId} preserveWindowScroll={preserveWindowScroll} scrollToPage={scrollToPage} onColsInputChange={onColsInputChange} />
                ))}
            </div>
            <div className="mb-1 d-flex justify-content-center">
                <button className="btn btn-sm btn-outline-primary" onClick={() => {
                    const hasFront = ranges.some(r => r.type === 'front');
                    const hasText = ranges.some(r => r.type === 'text');
                    const hasBack = ranges.some(r => r.type === 'back');
                    const covered = new Set<number>();
                    for (const r of ranges) for (let p = Math.min(r.from, r.to); p <= Math.max(r.from, r.to); p++) covered.add(p);
                    let uncoveredAtEnd = 0;
                    for (let p = numPages; p >= 1; p--) {
                        if (!covered.has(p)) uncoveredAtEnd++;
                        else break;
                    }
                    const defaultType: RangeType = ranges.length === 0 ? 'front' : (hasFront && hasText && !hasBack && uncoveredAtEnd < 5 ? 'back' : 'text');
                    addRangeOfType(defaultType);
                }} disabled={isAllCovered} style={{ fontSize: '0.85em', padding: '4px 16px', width: '100%' }}>New Range</button>
            </div>
            {isAllCovered ? <div className="text-center text-muted small mb-2">All pages are already covered by ranges.</div> : null}
            {ranges.length > 0 ? (
                <>
                    <hr className="mt-2 mb-1" style={{ borderTop: '1px solid #000000' }} />
                    <div className="d-flex justify-content-end align-items-center mb-2 flex-wrap">
                        <button className="btn btn-sm btn-success text-center" onClick={handleSubmit} disabled={isUpdating} style={{ padding: '2px 16px', width: '100%' }}>Define</button>
                    </div>
                </>
            ) : null}
            <p>{statusMsg}</p>
        </div>
    );
}
