import { PageInfo } from "@/Api/DataSchema/ApiDocuments";
import React, { useState, useEffect, useCallback, memo } from 'react';

import { PageRange } from '../../PageRange';
import * as FoliationType from '../../constants/FoliationType';
import * as Entity from '../../constants/Entity';           // PageTypeFrontMatter, PageTypeText, etc.


interface PageListProps {
    pageInfoArray: PageInfo[];
    onPageClick?: (seq: number) => void;
    thumbnails?: Thumbnail;
    definer?: boolean;
}

interface PageItemProps {
    page: PageInfo;
    withThumbnail: boolean;
    thumbnailSize: number;
    isSelected: boolean;
    onClick: (seq: number) => void;
}

interface Thumbnail {
    initSize: number;
    sizeSmall: number;
    panel: boolean;
}

interface PageDefinerProps {
    docId: number;
    numPages: number;
    urlGen?: {
        apiBulkPageSettings: () => string;
    };
}

export default function PageList({ pageInfoArray, onPageClick, thumbnails= {initSize: 0, sizeSmall: 0, panel: false}, definer=false }: PageListProps) {

    const [selectedPage, setSelectedPage] = useState<number | null>(null);

    const handleItemClick = useCallback((seq: number) => {
        setSelectedPage(seq);
        onPageClick?.(seq);
    }, [onPageClick]);

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


    return (
        <div className="page-list-panel">

            {(thumbnails.panel && thumbnails?.sizeSmall!==0) ? thumbnailPanel : ''}

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
                        withThumbnail={thumbnails?.sizeSmall!==0}
                        thumbnailSize={thumbnailSize ?? 0}
                        isSelected={selectedPage === page.sequence}
                        onClick={handleItemClick}
                    />
                ))}
            </div>

        {definer ? <PageDefiner docId={pageInfoArray[0].docId} numPages={pageInfoArray.length}/> : ''}

        </div>
    );
}

// Ausgelagerter Editor für einzelne Ranges – stabiler Komponententyp verhindert Remounts beim Tippen
const RangeEditor: React.FC<{
    r: {
        id: number;
        from: number;
        to: number;
        type: 'text' | 'front' | 'back';
        foliate: boolean;
        textFoliationType?: number;
        textFoliationStart?: number;
        textFoliationPrefix?: string;
        textFoliationSuffix?: string;
        textFoliationReverse?: boolean;
        autoFrontBack?: boolean;
        createCols?: boolean;
        colsNumber?: number;
    };
    index: number;
    numPages: number;
    updateRange: (id: number, patch: Partial<any>) => void;
    removeRange: (id: number) => void;
    focusedRangeId: number | null;
    setFocusedRangeId: (id: number | null) => void;
    ranges: Array<any>;
    preserveWindowScroll: (fn: () => void) => void;
}> = ({ r, index, numPages, updateRange, removeRange, focusedRangeId, setFocusedRangeId, ranges, preserveWindowScroll }) => {
    // Lokaler Eingabe-Puffer, damit Eingaben den Fokus nicht verlieren
    const [fromInput, setFromInput] = useState<string>(() => String(r.from));
    const [toInput, setToInput] = useState<string>(() => String(r.to));

    // Wenn sich der Range von außen ändert, Eingabefelder synchronisieren
    useEffect(() => {
        setFromInput(String(r.from));
    }, [r.from]);
    useEffect(() => {
        setToInput(String(r.to));
    }, [r.to]);

    const commitFrom = useCallback(() => {
        const n = parseInt(fromInput, 10);
        if (!Number.isNaN(n)) {
            if (n !== r.from) updateRange(r.id, { from: n });
        } else {
            // Ungültige Eingabe zurücksetzen auf aktuellen Wert
            setFromInput(String(r.from));
        }
    }, [fromInput, r.id, r.from, updateRange]);

    const commitTo = useCallback(() => {
        const n = parseInt(toInput, 10);
        if (!Number.isNaN(n)) {
            if (n !== r.to) updateRange(r.id, { to: n });
        } else {
            setToInput(String(r.to));
        }
    }, [toInput, r.id, r.to, updateRange]);

    const pr = new PageRange(
        Math.max(1, Math.min(r.from, r.to)),
        Math.min(numPages, Math.max(r.from, r.to)),
        numPages
    );
    const textFoliationPreview = r.type === 'text' && r.foliate && !r.autoFrontBack
        ? pr.toStringWithFoliation('', ' - ', '', r.textFoliationType!, r.textFoliationStart!, (r.textFoliationPrefix||'').replace(/\s+/g,''), (r.textFoliationSuffix||'').replace(/\s+/g,''), !!r.textFoliationReverse)
        : '';
    const fbFoliationPreview = r.foliate && (r.type === 'front' || r.type === 'back')
        ? pr.toStringWithFoliation('', ' - ', '', FoliationType.FOLIATION_CONSECUTIVE, 1, 'x')
        : '';

    const isFocused = focusedRangeId === r.id;

    return (
        <div
            className="card mb-2"
            onClick={() => setFocusedRangeId(r.id)}
            onFocusCapture={() => setFocusedRangeId(r.id)}
            onBlurCapture={(e) => {
                // nur zurücksetzen, wenn Fokus die Karte komplett verlässt
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setFocusedRangeId(null);
                }
            }}
            style={{
                padding: '10px',
                border: '1px solid ' + (isFocused ? '#0d6efd' : '#999'),
                borderRadius: 8,
                boxShadow: isFocused ? '0 0 0 0.2rem rgba(13,110,253,.25)' : 'none'
            }}
        >
            <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-secondary text-uppercase">{r.type}</span>
                <button className="btn btn-sm btn-outline-danger" onClick={() => removeRange(r.id)}>Remove</button>
            </div>
            <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
                <input
                    type="number"
                    min={1}
                    max={numPages}
                    value={fromInput}
                    onChange={e => {
                        const v = e.target.value;
                        setFromInput(v);
                        const n = parseInt(v, 10);
                        if (!Number.isNaN(n) && n !== r.from) updateRange(r.id, { from: n });
                    }}
                    onBlur={commitFrom}
                    onKeyDown={e => { if (e.key === 'Enter') commitFrom(); }}
                    className="form-control form-control-sm rounded-2"
                    style={{ width: 60 }}
                />
                <label className="ms-2 me-2">–</label>
                {/* To-Input mit oben positioniertem Foliation-Toggle-Button (volle Breite wie das Input) */}
                <div className="position-relative d-inline-block" style={{ width: 60 }}>
                    {(((r.type === 'text') && !r.autoFrontBack) || (r.type !== 'text')) && (
                        <button
                            type="button"
                            className={`position-absolute w-100 btn btn-sm ${r.foliate ? 'btn-primary' : 'btn-outline-secondary'}`}
                            style={{ top: -30, lineHeight: 0.5, fontSize: '0.7em', borderColor: '#000', borderWidth: 1, borderStyle: 'solid' }}
                            title="Foliation"
                            onClick={() => preserveWindowScroll(() => updateRange(r.id, { foliate: !r.foliate }))}
                        >
                            Foliation
                        </button>
                    )}
                    <input
                        type="number"
                        min={1}
                        max={numPages}
                        value={toInput}
                        onChange={e => {
                            const v = e.target.value;
                            setToInput(v);
                            const n = parseInt(v, 10);
                            if (!Number.isNaN(n) && n !== r.to) updateRange(r.id, { to: n });
                        }}
                        onBlur={commitTo}
                        onKeyDown={e => { if (e.key === 'Enter') commitTo(); }}
                        className="form-control form-control-sm rounded-2"
                        style={{ width: '100%' }}
                    />
                </div>
                <span className={`ms-3 ${r.type === 'text' ? 'text-primary' : 'text-muted'}`}>
                    {(textFoliationPreview || fbFoliationPreview) && (
                        <>
                            {' '}{textFoliationPreview || fbFoliationPreview}
                        </>
                    )}
                </span>
            </div>

            {/* TEXT-spezifische Optionen */}
            {r.type === 'text' ? (
                <>
                    {!r.autoFrontBack && (
                        <>
                            {r.foliate && (
                                <div
                                    className="mt-2 p-2"
                                    style={{
                                        border: '1px solid #999',
                                        background: '#f8f9fa',
                                        borderRadius: 8,
                                        display: 'flex',
                                        alignItems: 'center',
                                        minHeight: 44
                                    }}
                                >
                                    <div className="d-flex align-items-center flex-wrap gap-3 mb-2">
                                        <label className="me-1 small text-muted">Foliation Type</label>
                                        <select
                                            className="form-select form-select-sm rounded-2"
                                            style={{ width: 220 }}
                                            value={r.textFoliationType}
                                            onChange={(e) => updateRange(r.id, { textFoliationType: parseInt(e.target.value) })}
                                        >
                                            <option value={FoliationType.FOLIATION_CONSECUTIVE}>consecutive (1,2,3,...)</option>
                                            <option value={FoliationType.FOLIATION_RECTOVERSO}>recto/verso (1r,1v,...)</option>
                                            <option value={FoliationType.FOLIATION_LEFTRIGHT}>left/right (1l,1r,...)</option>
                                            <option value={FoliationType.FOLIATION_AB}>a/b (1a,1b,...)</option>
                                        </select>
                                        <label className="me-1 small text-muted">Start</label>
                                        <input
                                            type="number"
                                            min={1}
                                            className="form-control form-control-sm rounded-2"
                                            value={r.textFoliationStart}
                                            onChange={(e) => updateRange(r.id, { textFoliationStart: Math.max(1, Number(e.target.value)) })}
                                            style={{ width: 60 }}
                                        />
                                        <label className="me-1 small text-muted">Prefix</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-2"
                                            value={r.textFoliationPrefix}
                                            onChange={(e) => updateRange(r.id, { textFoliationPrefix: e.target.value })}
                                            style={{ width: 100 }}
                                        />
                                        <label className="me-1 ms-1 small text-muted">Suffix</label>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm rounded-2"
                                            value={r.textFoliationSuffix}
                                            onChange={(e) => updateRange(r.id, { textFoliationSuffix: e.target.value })}
                                            style={{ width: 100 }}
                                        />
                                        <label className="d-flex align-items-center gap-2 small text-muted">
                                            <input
                                                type="checkbox"
                                                checked={!!r.textFoliationReverse}
                                                onChange={(e) => updateRange(r.id, { textFoliationReverse: e.target.checked })}
                                            />
                                            Reverse
                                        </label>
                                    </div>
                                </div>
                            )}
                            {/* Spaltenzuweisung optional (wie zuvor global, jetzt je Text-Range) */}
                            <div className="mt-2">
                                <label className="d-flex align-items-center gap-2">
                                    <input type="checkbox" checked={!!r.createCols}
                                           onChange={e => updateRange(r.id, { createCols: e.target.checked })} />
                                    <input
                                        type="number"
                                        min={1}
                                        className="form-control form-control-sm rounded-2"
                                        style={{ width: 60 }}
                                        disabled={!r.createCols}
                                        value={r.colsNumber ?? 1}
                                        onChange={e => updateRange(r.id, { colsNumber: Math.max(1, Number(e.target.value)) })}
                                    />
                                    <span className="small text-muted">column(s) per page</span>
                                </label>
                            </div>
                        </>
                    )}

                    {/* Auto Front/Back-Option wurde auf Wunsch vollständig entfernt (nie verfügbar). */}
                    {/* Keine weitere Vorschau innerhalb der Text-Range – Einstellungen erfolgen in den automatisch erzeugten Front/Back-Ranges */}
                </>
            ) : (
                // Nicht-Text: nur einfache Foliation-Checkbox (keine Optionen)
                <div className="mb-2"></div>
            )}
        </div>
    );
};

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

function PageDefiner({ docId, numPages, urlGen }: PageDefinerProps) {

    // Globale Flags
    const [overwritePageTypes, setOverwritePageTypes] = useState(false);
    const [overwriteFoliation, setOverwriteFoliation] = useState(false);

    // Status und Aktualisierungsflag
    const [statusMsg, setStatusMsg] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Range-Definitionen
    type RangeType = 'text' | 'front' | 'back';
    interface RangeConfig {
        id: number;
        from: number;
        to: number;
        type: RangeType;
        // allgemeine Foliations-Flag pro Range
        foliate: boolean;
        // nur für TEXT-Ranges
        textFoliationType?: number;
        textFoliationStart?: number;
        textFoliationPrefix?: string;
        textFoliationSuffix?: string;
        textFoliationReverse?: boolean;
        autoFrontBack?: boolean; // Front/Back automatisch aus angrenzenden Seiten setzen
        foliateFrontBack?: boolean; // bei Auto FB: Front/Back folieren (x1, x2, ...)
        createCols?: boolean;
        colsNumber?: number;
    }

    const [ranges, setRanges] = useState<RangeConfig[]>([]);
    const [nextId, setNextId] = useState(1);
    // Aktuell fokussierte Range (für blauen Rahmen)
    const [focusedRangeId, setFocusedRangeId] = useState<number | null>(null);

    // Helfer: Scroll-Position konservieren, um "Ruckeln" zu vermeiden
    const preserveWindowScroll = (fn: () => void) => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        fn();
        // nach Render zurückscrollen
        setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' as any }), 0);
    };

    // Abdeckung berechnen
    const coveredPages = React.useMemo(() => {
        const covered = new Set<number>();
        for (const r of ranges) {
            const pr = new PageRange(Math.max(1, r.from), Math.min(numPages, r.to), numPages);
            for (const p of pr.toArray()) covered.add(p);
        }
        return covered;
    }, [ranges, numPages]);

    const isAllCovered = coveredPages.size === numPages;
    const anyAutoFB = ranges.some(r => r.type === 'text' && r.autoFrontBack);

    // Helfer: Normalisierte From/To eines RangeConfig
    const normFromTo = (r: RangeConfig) => {
        const from = Math.max(1, Math.min(r.from, r.to));
        const to = Math.min(numPages, Math.max(r.from, r.to));
        return { from, to };
    };

    // Sync: passt Frontmatter.to an das kleinste Text.from - 1 an
    //       und Backmatter.from an das größte Text.to + 1 – automatisch
    const syncFrontBack = (list: RangeConfig[]): RangeConfig[] => {
        const texts = list.filter(r => r.type === 'text');
        if (texts.length === 0) return list;

        // min(Text.from) und max(Text.to) mit Normalisierung berechnen
        let minTextFrom = Infinity;
        let maxTextTo = -Infinity;
        for (const t of texts) {
            const nf = Math.max(1, Math.min(t.from, t.to));
            const nt = Math.min(numPages, Math.max(t.from, t.to));
            if (nf < minTextFrom) minTextFrom = nf;
            if (nt > maxTextTo) maxTextTo = nt;
        }

        // Falls keine sinnvollen Werte (sollte nicht passieren, da texts.length>0)
        if (!Number.isFinite(minTextFrom) || !Number.isFinite(maxTextTo)) return list;

        let changed = false;
        const mapped = list.map(r => {
            if (r.type === 'front') {
                const desiredTo = Math.max(1, Math.min(numPages, minTextFrom - 1));
                if (r.to !== desiredTo) {
                    changed = true;
                    return { ...r, to: desiredTo };
                }
            }
            if (r.type === 'back') {
                const desiredFrom = Math.max(1, Math.min(numPages, maxTextTo + 1));
                if (r.from !== desiredFrom) {
                    changed = true;
                    return { ...r, from: desiredFrom };
                }
            }
            return r;
        });

        return changed ? mapped : list;
    };

    // Bereich hinzufügen mit vorgegebenem Typ und intelligenten Initialwerten
    const addRangeOfType = (type: RangeType) => {
        if (anyAutoFB || isAllCovered) return;

        // Es darf nur je eine Front- bzw. Backmatter-Range existieren
        if ((type === 'front' && ranges.some(r => r.type === 'front')) ||
            (type === 'back' && ranges.some(r => r.type === 'back'))) {
            return;
        }

        // Maximal bisher abgedecktes Ende für "konsekutiv nach vorheriger Range"
        let maxTo = 0;
        for (const r of ranges) {
            const { to } = normFromTo(r);
            if (to > maxTo) maxTo = to;
        }
        const nextStart = Math.min(numPages, Math.max(1, maxTo + 1));

        // Minimales From über alle bestehenden Ranges
        let minOtherFrom: number | null = null;
        for (const r of ranges) {
            const { from } = normFromTo(r);
            minOtherFrom = minOtherFrom === null ? from : Math.min(minOtherFrom, from);
        }

        // Minimales From aller Backmatter-Ranges
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
                // Wunsch: Ohne bestehende Text-Range soll Frontmatter initial 1..5 sein
                initFrom = 1;
                initTo = Math.min(5, numPages);
            } else if (ranges.length > 0 && minOtherFrom !== null) {
                // Front vor alle existierenden Ranges legen
                initFrom = 1;
                initTo = Math.max(1, Math.min(numPages, minOtherFrom - 1));
                if (initTo < initFrom) initTo = 1; // Fallback 1..1
            } else {
                // Standard
                initFrom = 1;
                initTo = numPages;
            }
        } else if (type === 'text') {
            // Spezielle Startwerte für die allererste Text-Range, wenn weder Front- noch Backmatter existieren:
            // from = 6, to = numPages - 3 (beides innerhalb gültiger Grenzen clampen)
            const hasFrontMatter = ranges.some(r => r.type === 'front');
            const hasBackMatter = ranges.some(r => r.type === 'back');
            const hasAnyText = ranges.some(r => r.type === 'text');

            if (!hasAnyText && !hasFrontMatter && !hasBackMatter) {
                // Erste Text-Range ohne Front/Back vorhanden
                initFrom = Math.min(Math.max(1, 6), numPages);
                const desiredTo = numPages - 3;
                initTo = Math.min(numPages, Math.max(initFrom, desiredTo));
            } else if (!hasAnyText && hasFrontMatter && !hasBackMatter) {
                // NEUE REGEL: Wenn bereits Frontmatter existiert, aber keine Text- und keine Backmatter-Range,
                // dann soll die Text-Range bis (numPages - 3) gehen. Start bleibt "nextStart" hinter Front.
                initFrom = nextStart;
                const desiredTo = numPages - 3;
                // clamp: mindestens initFrom, höchstens numPages
                initTo = Math.min(numPages, Math.max(initFrom, desiredTo));
            } else if (minBackFrom !== null) {
                // Text muss kleiner als Backmatter sein
                const limitTo = Math.max(1, Math.min(numPages, minBackFrom - 1));
                initFrom = Math.min(nextStart, limitTo);
                initTo = limitTo;
                if (initFrom > initTo) initFrom = initTo; // Fallback auf einseitig
                if (initFrom < 1) initFrom = 1;
            } else {
                // Standard: konsekutiv nach letzter Range bis Ende
                initFrom = nextStart;
                initTo = numPages;
            }
        } else if (type === 'back') {
            // Backmatter darf nur hinzugefügt werden, wenn die letzte Seite noch NICHT abgedeckt ist
            // Prüfe, ob Seite numPages bereits durch irgendeine Range (inkl. Normalisierung) abgedeckt ist
            const lastCovered = ranges.some(r => {
                const from = Math.max(1, Math.min(r.from, r.to));
                const to = Math.min(numPages, Math.max(r.from, r.to));
                return to === numPages; // reicht, denn wenn 'to' = numPages, deckt die Range die letzte Seite ab
            });
            if (lastCovered) {
                return; // Backmatter nicht hinzufügen, wenn letzte Seite schon belegt ist
            }
            // Standard: konsekutiv nach letzter Range bis Ende
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
        // Neu hinzugefügte Range sofort fokussieren (blauer Rahmen)
        setFocusedRangeId(newId);
    };

    const updateRange = (id: number, patch: Partial<RangeConfig>) => {
        setRanges(prev => {
            // Zunächst den Ziel-Range patchen
            let updated = prev.map(r => r.id === id ? { ...r, ...patch } : r);

            const changed = updated.find(r => r.id === id);
            if (!changed) return updated;

            // Normalisierte Werte des geänderten Ranges ermitteln
            const nf = Math.max(1, Math.min(changed.from, changed.to));
            const nt = Math.min(numPages, Math.max(changed.from, changed.to));

            // 1. Wenn Auto Front/Back an einer Text-Range aktiviert wurde, automatisch Front- und Back-Range hinzufügen
            if (changed.type === 'text' && typeof patch.autoFrontBack !== 'undefined' && patch.autoFrontBack) {
                const hasFront = updated.some(r => r.type === 'front');
                const hasBack = updated.some(r => r.type === 'back');
                let maxId = updated.reduce((m, r) => Math.max(m, r.id), 0);
                const newRanges: RangeConfig[] = [];
                if (!hasFront && nf > 1) {
                    newRanges.push({
                        id: ++maxId,
                        type: 'front',
                        from: 1,
                        to: Math.max(1, nf - 1),
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
                if (!hasBack && nt < numPages) {
                    newRanges.push({
                        id: ++maxId,
                        type: 'back',
                        from: Math.min(numPages, nt + 1),
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

            // 2. Kollisionen automatisch auflösen
            // Frontmatter: wenn 'to' vergrößert/gesetzt und Text-from erreicht/überschreitet → Text-from = front.to + 1
            if (changed.type === 'front' && typeof patch.to !== 'undefined') {
                // Nächstgelegene Text-Range finden, deren From <= nt
                let textRanges = updated.filter(r => r.type === 'text');
                if (textRanges.length > 0) {
                    // Wähle die Text-Range mit dem kleinsten From
                    let target = textRanges.reduce((a, b) => (Math.min(a.from, a.to) <= Math.min(b.from, b.to) ? a : b));
                    const trFrom = Math.max(1, Math.min(target.from, target.to));
                    if (nt >= trFrom) {
                        const newFrom = Math.min(numPages, nt + 1);
                        updated = updated.map(r => r.id === target.id ? { ...r, from: Math.min(newFrom, Math.max(r.from, r.to)), to: Math.max(r.from, r.to) } : r);
                    }
                }
            }

            // Backmatter: wenn 'from' verkleinert/gesetzt und Text-to trifft/unterschreitet → Text-to = back.from - 1
            if (changed.type === 'back' && typeof patch.from !== 'undefined') {
                const newBackFrom = nf; // bei Back nehmen wir den normalisierten From
                let candidates = updated.filter(r => r.type === 'text');
                if (candidates.length > 0) {
                    // Wähle die Text-Range mit dem größten To
                    let target = candidates.reduce((a, b) => (Math.max(a.from, a.to) >= Math.max(b.from, b.to) ? a : b));
                    const trTo = Math.min(numPages, Math.max(target.from, target.to));
                    if (newBackFrom <= trTo) {
                        const newTo = Math.max(1, newBackFrom - 1);
                        updated = updated.map(r => r.id === target.id ? { ...r, to: Math.max(Math.min(newTo, Math.max(r.from, r.to)), Math.min(r.from, r.to)) } : r);
                    }
                }
            }

            // 7. (Angepasst) Auto-Front/Back nicht automatisch deaktivieren, wenn Front/Back existiert,
            //     da diese Ranges nun bewusst beim Aktivieren erzeugt werden.

            // 8. NEU: Front/Back stets an Text-Ranges koppeln (Front.to = min(Text.from)-1; Back.from = max(Text.to)+1)
            updated = syncFrontBack(updated);

            return updated;
        });
    };

    const removeRange = (id: number) => {
        setRanges(prev => prev.filter(r => r.id !== id));
    };

    // Funktion beim Klick auf "Define"
    const handleSubmit = async () => {
        if (isUpdating) return;

        setIsUpdating(true);
        setStatusMsg("Updating, please wait...");

        const pageDefs : any[] = [];

        // Helper zum Pushen von Seiten aus einem PageRange mit ggf. Type und Foliation
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
                const def: any = { docId, page };
                if (overwritePageTypes && typeof opts.pageType !== 'undefined') def.type = opts.pageType;
                if (opts.foliate) {
                    def.foliation = pr.foliate(
                        page,
                        opts.foliationType ?? FoliationType.FOLIATION_CONSECUTIVE,
                        opts.start ?? 1,
                        (opts.prefix ?? '').replace(/\s+/g, ''),
                        (opts.suffix ?? '').replace(/\s+/g, ''),
                        opts.reverse ?? false
                    );
                    def.overwriteFoliation = overwriteFoliation;
                }
                pageDefs.push(def);
            }
        };

        // Einheitliche Verarbeitung aller Ranges (Auto-Front/Back wird nun als echte Front-/Back-Ranges abgebildet)
        for (const r of ranges) {
            const from = Math.max(1, Math.min(r.from, r.to));
            const to = Math.min(numPages, Math.max(r.from, r.to));
            const pr = new PageRange(from, to, numPages);
            if (r.type === 'text') {
                pushRange(pr, {
                    pageType: Entity.PageTypeText,
                    foliate: !!r.foliate && !r.autoFrontBack, // bei AutoFB werden Text-Foliationsoptionen in dieser Range nicht verwendet
                    foliationType: r.textFoliationType,
                    start: r.textFoliationStart,
                    prefix: r.textFoliationPrefix,
                    suffix: r.textFoliationSuffix,
                    reverse: r.textFoliationReverse
                });
            } else if (r.type === 'front') {
                pushRange(pr, {
                    pageType: Entity.PageTypeFrontMatter,
                    foliate: !!r.foliate,
                    foliationType: FoliationType.FOLIATION_CONSECUTIVE,
                    start: 1,
                    prefix: 'x'
                });
            } else if (r.type === 'back') {
                pushRange(pr, {
                    pageType: Entity.PageTypeBackMatter,
                    foliate: !!r.foliate,
                    foliationType: FoliationType.FOLIATION_CONSECUTIVE,
                    start: 1,
                    prefix: 'x'
                });
            }
        }

        try {
            const response = await fetch(urlGen.apiBulkPageSettings(), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: pageDefs }),
            });
            if (!response.ok) throw new Error("Network response was not ok");
            setStatusMsg("Update completed successfully!");
            // Optional: Hier kannst du noch eine Seite neu laden, z.B. window.location.reload();
        } catch (error: any) {
            setStatusMsg("Update failed: " + error.message);
        } finally {
            setIsUpdating(false);
        }
    };

    // RangeEditor wurde nach unten (außerhalb von PageDefiner) ausgelagert.

    // Globaler Sync nach JEDEM Range-Change (z. B. nach addRangeOfType), damit Front/Back automatisch angepasst werden
    useEffect(() => {
        setRanges(prev => syncFrontBack(prev));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numPages, ranges]);

    return (
        <div className="page-definer">
            <h4>Page Definer</h4>

            {/* Start mit drei Buttons: Text / Frontmatter / Backmatter (diese Reihenfolge) */}
            <div className="mb-2 d-flex gap-2 align-items-center flex-wrap">
                <button className="btn btn-sm btn-outline-primary"
                        onClick={() => addRangeOfType('front')}
                        disabled={anyAutoFB || isAllCovered || ranges.some(r => r.type === 'front')}
                >Frontmatter</button>
                <button className="btn btn-sm btn-outline-primary"
                        onClick={() => addRangeOfType('text')}
                        disabled={anyAutoFB || isAllCovered}
                >Text Range</button>
                <button className="btn btn-sm btn-outline-primary"
                        onClick={() => addRangeOfType('back')}
                        disabled={
                            anyAutoFB ||
                            isAllCovered ||
                            ranges.some(r => r.type === 'back') ||
                            // Zusätzlich disabled, wenn die letzte Seite bereits abgedeckt ist
                            ranges.some(r => {
                                const from = Math.max(1, Math.min(r.from, r.to));
                                const to = Math.min(numPages, Math.max(r.from, r.to));
                                return to === numPages;
                            })
                        }
                >Backmatter</button>
                {anyAutoFB && <span className="ms-2 text-muted">Adding more ranges is disabled while automatic Front/Back is selected.</span>}
                {isAllCovered && <span className="ms-2 text-muted">All pages are already covered by ranges.</span>}
            </div>

            {/* Liste der angelegten Ranges (Sortierung: front → text → back) */}
            <div>
                {React.useMemo(() => {
                    const typeOrder: Record<RangeType, number> = { front: 0, text: 1, back: 2 };
                    const sorted = [...ranges].sort((a, b) => {
                        const ta = typeOrder[a.type] - typeOrder[b.type];
                        if (ta !== 0) return ta;
                        return a.id - b.id; // Stabilität: Erstellreihenfolge
                    });
                    return sorted.map((r, idx) => (
                        <RangeEditor
                            key={r.id}
                            r={r}
                            index={idx}
                            numPages={numPages}
                            updateRange={updateRange}
                            removeRange={removeRange}
                            focusedRangeId={focusedRangeId}
                            setFocusedRangeId={setFocusedRangeId}
                            ranges={ranges}
                            preserveWindowScroll={preserveWindowScroll}
                        />
                    ));
                }, [ranges, numPages, focusedRangeId])}
            </div>

            {/* Globale Optionen & Aktion: erst anzeigen, wenn mind. eine Range existiert */}
            {ranges.length > 0 && (
                <>
                    {/* eleganter Trenner nach der letzten Range */}
                    <hr className="mt-3 mb-2" style={{ borderTop: '1px solid #000000' }} />

                    {/* Overwrite-Option als Button + Define-Button rechtsbündig (gleiche Größe wie Remove) */}
                    <div className="d-flex justify-content-end align-items-center mb-2 flex-wrap">
                        <button
                            type="button"
                            className={`btn btn-sm ${overwritePageTypes && overwriteFoliation ? 'btn-primary' : 'btn-outline-secondary'} me-2`}
                            onClick={() => {
                                const v = !(overwritePageTypes && overwriteFoliation);
                                setOverwritePageTypes(v);
                                setOverwriteFoliation(v);
                            }}
                            aria-pressed={overwritePageTypes && overwriteFoliation}
                            title="Overwrite Existing Ranges"
                            style={{ borderColor: '#000', borderWidth: 1, borderStyle: 'solid' }}
                        >
                            Overwrite Existing Ranges
                        </button>

                        <button
                            className="btn btn-sm btn-success p-0 text-center"
                            onClick={handleSubmit}
                            disabled={isUpdating}
                            style={{ width: 60, flex: '0 0 60px' }}
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