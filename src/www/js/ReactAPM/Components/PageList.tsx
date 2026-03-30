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

        if (type === 'front') {
            if (ranges.length > 0 && minOtherFrom !== null) {
                // Front vor alle existierenden Ranges legen
                initFrom = 1;
                initTo = Math.max(1, Math.min(numPages, minOtherFrom - 1));
                if (initTo < initFrom) initTo = 1; // Fallback 1..1
            } else {
                // Erste Range → start bei 1 bis Ende
                initFrom = 1;
                initTo = numPages;
            }
        } else if (type === 'text') {
            if (minBackFrom !== null) {
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
            // Standard: konsekutiv nach letzter Range bis Ende
            initFrom = nextStart;
            initTo = numPages;
        }

        setRanges(prev => ([
            ...prev,
            {
                id: nextId,
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

    // UI für eine einzelne Range
    const RangeEditor: React.FC<{ r: RangeConfig, index: number }> = ({ r, index }) => {
        const pr = new PageRange(
            Math.max(1, Math.min(r.from, r.to)),
            Math.min(numPages, Math.max(r.from, r.to)),
            numPages
        );
        const label = pr.toString();
        const textFoliationPreview = r.type === 'text' && r.foliate && !r.autoFrontBack
            ? pr.toStringWithFoliation('', ' - ', '', r.textFoliationType!, r.textFoliationStart!, (r.textFoliationPrefix||'').replace(/\s+/g,''), (r.textFoliationSuffix||'').replace(/\s+/g,''), !!r.textFoliationReverse)
            : '';
        const fbFoliationPreview = r.foliate && (r.type === 'front' || r.type === 'back')
            ? pr.toStringWithFoliation('', ' - ', '', FoliationType.FOLIATION_CONSECUTIVE, 1, 'x')
            : '';
        // Für die Auto‑Front/Back‑Vorschau NICHT auf interne PageRange‑Felder zugreifen (pr hat keine 'from'/'to')
        // Stattdessen die normalisierten Grenzen aus r berechnen
        const nf = Math.max(1, Math.min(r.from, r.to));
        const nt = Math.min(numPages, Math.max(r.from, r.to));
        const fbFront = r.autoFrontBack ? new PageRange(1, nf - 1, numPages) : null;
        const fbBack = r.autoFrontBack ? new PageRange(nt + 1, numPages, numPages) : null;
        const hasFront = ranges.some(x => x.type === 'front');
        const hasBack = ranges.some(x => x.type === 'back');

        return (
            <div className="card mb-2" style={{ padding: '10px', border: '1px solid #eee' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Range #{index + 1}</strong>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeRange(r.id)}>Remove</button>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                    <label className="me-2">From</label>
                    <input type="number" min={1} max={numPages} value={r.from}
                           onChange={e => updateRange(r.id, { from: Number(e.target.value) })}
                           style={{ width: 80 }} />
                    <label className="ms-2 me-2">to</label>
                    <input type="number" min={1} max={numPages} value={r.to}
                           onChange={e => updateRange(r.id, { to: Number(e.target.value) })}
                           style={{ width: 80 }} />
                    <span className="badge bg-secondary text-uppercase ms-3">{r.type}</span>
                    <span className="ms-3 text-muted">
                        {label}
                        {(textFoliationPreview || fbFoliationPreview) && (
                            <>
                                {' '}({textFoliationPreview || fbFoliationPreview})
                            </>
                        )}
                    </span>
                </div>

                {/* TEXT-spezifische Optionen */}
                {r.type === 'text' ? (
                    <>
                        {!r.autoFrontBack && (
                            <>
                                <div className="mb-2">
                                    <label>
                                        <input type="checkbox" checked={!!r.foliate}
                                               onChange={e => updateRange(r.id, { foliate: e.target.checked })} />{' '}
                                        Foliation
                                    </label>
                                </div>
                                {r.foliate && (
                                    <div className="mt-2" style={{ borderLeft: '3px solid #eee', paddingLeft: '10px' }}>
                                        <div className="mb-1">
                                            <label className="me-2">Foliation type:</label>
                                            <select
                                                value={r.textFoliationType}
                                                onChange={(e) => updateRange(r.id, { textFoliationType: parseInt(e.target.value) })}
                                            >
                                                <option value={FoliationType.FOLIATION_CONSECUTIVE}>consecutive (1,2,3,...)</option>
                                                <option value={FoliationType.FOLIATION_RECTOVERSO}>recto/verso (1r,1v,...)</option>
                                                <option value={FoliationType.FOLIATION_LEFTRIGHT}>left/right (1l,1r,...)</option>
                                                <option value={FoliationType.FOLIATION_AB}>a/b (1a,1b,...)</option>
                                            </select>
                                        </div>
                                        <div className="mb-1">
                                            <label className="me-2">Start number:</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={r.textFoliationStart}
                                                onChange={(e) => updateRange(r.id, { textFoliationStart: Math.max(1, Number(e.target.value)) })}
                                                style={{ width: '80px' }}
                                            />
                                        </div>
                                        <div className="mb-1">
                                            <label className="me-2">Prefix:</label>
                                            <input
                                                type="text"
                                                value={r.textFoliationPrefix}
                                                onChange={(e) => updateRange(r.id, { textFoliationPrefix: e.target.value })}
                                                style={{ width: '120px' }}
                                            />
                                            <label className="ms-3 me-2">Suffix:</label>
                                            <input
                                                type="text"
                                                value={r.textFoliationSuffix}
                                                onChange={(e) => updateRange(r.id, { textFoliationSuffix: e.target.value })}
                                                style={{ width: '120px' }}
                                            />
                                        </div>
                                        <div className="mb-1">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={!!r.textFoliationReverse}
                                                    onChange={(e) => updateRange(r.id, { textFoliationReverse: e.target.checked })}
                                                />{' '}
                                                Reverse order
                                            </label>
                                        </div>
                                    </div>
                                )}
                                {/* Spaltenzuweisung optional (wie zuvor global, jetzt je Text-Range) */}
                                <div className="mt-2">
                                    <label>
                                        <input type="checkbox" checked={!!r.createCols}
                                               onChange={e => updateRange(r.id, { createCols: e.target.checked })} />{' '}

                                        <input type="number" min={1} style={{ width: 60 }} disabled={!r.createCols}
                                               value={r.colsNumber ?? 1}
                                               onChange={e => updateRange(r.id, { colsNumber: Math.max(1, Number(e.target.value)) })} />{' '}
                                        column(s) per page
                                    </label>
                                </div>
                            </>
                        )}

                        {/* Auto FB-Option am Ende; deaktivieren, wenn Front/Back existiert */}
                        <div className="mb-2 mt-2">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={!!r.autoFrontBack}
                                    disabled={!r.autoFrontBack && (hasFront || hasBack)}
                                    onChange={e => updateRange(r.id, { autoFrontBack: e.target.checked })}
                                />{' '}
                                Set Front/Back matter automatically around this text range
                            </label>
                        </div>
                        {/* Keine weitere Vorschau innerhalb der Text-Range – Einstellungen erfolgen in den automatisch erzeugten Front/Back-Ranges */}
                    </>
                ) : (
                    // Nicht-Text: nur einfache Foliation-Checkbox (keine Optionen)
                    <div className="mb-2">
                        <label>
                            <input type="checkbox" checked={!!r.foliate}
                                   onChange={e => updateRange(r.id, { foliate: e.target.checked })} />{' '}
                            Foliation
                        </label>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="page-definer">
            <h3>Page Definer</h3>

            {/* Start mit drei Buttons: Text / Frontmatter / Backmatter (diese Reihenfolge) */}
            <div className="mb-2 d-flex gap-2 align-items-center flex-wrap">
                <button className="btn btn-sm btn-primary"
                        onClick={() => addRangeOfType('text')}
                        disabled={anyAutoFB || isAllCovered}
                >Text Range</button>
                <button className="btn btn-sm btn-outline-secondary"
                        onClick={() => addRangeOfType('front')}
                        disabled={anyAutoFB || isAllCovered || ranges.some(r => r.type === 'front')}
                >Frontmatter</button>
                <button className="btn btn-sm btn-outline-secondary"
                        onClick={() => addRangeOfType('back')}
                        disabled={anyAutoFB || isAllCovered || ranges.some(r => r.type === 'back')}
                >Backmatter</button>
                {anyAutoFB && <span className="ms-2 text-muted">Adding more ranges is disabled while automatic Front/Back is selected.</span>}
                {isAllCovered && <span className="ms-2 text-muted">All pages are already covered by ranges.</span>}
            </div>

            {/* Liste der angelegten Ranges */}
            <div>
                {ranges.map((r, idx) => (
                    <RangeEditor key={r.id} r={r} index={idx} />
                ))}
            </div>

            {/* Globale Optionen: erst anzeigen, wenn mind. eine Range existiert */}
            {ranges.length > 0 && (
                <>
                    <div className="mt-2">
                        <label>
                            <input type="checkbox" checked={overwritePageTypes}
                                   onChange={e => setOverwritePageTypes(e.target.checked)} />{' '}
                            Overwrite current page types
                        </label>
                    </div>
                    <div className="mt-1">
                        <label>
                            <input type="checkbox" checked={overwriteFoliation}
                                   onChange={e => setOverwriteFoliation(e.target.checked)} />{' '}
                            Overwrite current page foliation
                        </label>
                    </div>
                </>
            )}

            {ranges.length > 0 && (
                <button className="btn btn-sm btn-success" onClick={handleSubmit} disabled={isUpdating}>
                    Define
                </button>
            )}

            <p>{statusMsg}</p>
        </div>
    );
}