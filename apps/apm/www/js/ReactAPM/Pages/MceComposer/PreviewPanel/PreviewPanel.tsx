import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {EditionInterface} from "@/Edition/EditionInterface";
import './PreviewPanel.css';
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import {ArrowClockwise, Download,} from "react-bootstrap-icons";
import {useEffect, useState} from "react";
import {SystemStyles, SystemStyleSheet} from "@/defaults/EditionStyles/SystemStyleSheet";
import TypesetterDocumentViewer from "@/ReactAPM/Components/TypesetterDocumentViewer/TypesetterDocumentViewer";
import {TypesetterDocument} from "@thomas-inst/typesetter";
import {Edition} from "@/Edition/Edition";
import {getApiPdfData, getTypesetEdition} from "@/ReactAPM/Pages/MceComposer/PreviewPanel/EditionTypesettingUtilities";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import PreviewPageControls from "@/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewPageControls";
import PreviewZoomControls from "@/ReactAPM/Pages/MceComposer/PreviewPanel/PreviewZoomControls";
import {Spinner} from "react-bootstrap";
import {ApiTypesetPdfRequestData} from "@/Api/DataSchema/ApiPdfUrl";
import {WebStorageKeyCache} from "@/toolbox/KeyCache/WebStorageKeyCache";
import {nextTick} from "@/ReactAPM/ToolBox/NextTick";

interface PreviewPanelProps extends TabbableElementProps {
  /**
   * A string to identify the preview panel's edition
   */
  editionKey: string | null;
  edition: EditionInterface | null;
  getPdfUrl: (data: ApiTypesetPdfRequestData) => Promise<string>;
}

interface PreviewPanelSettings {
  styleSheetId: string | null;
}

export default function PreviewPanel({editionKey, edition, getPdfUrl}: PreviewPanelProps) {

  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [typesetEdition, setTypesetEdition] = useState<null | TypesetterDocument>(null);
  const [styleSheetId, setStyleSheetId] = useState<string | null>(null);
  const [systemStyles, setSystemStyles] = useState<SystemStyles | null>(null);
  const [previewUpToDate, setPreviewUpToDate] = useState(false);
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [pdfDownloadError, setPdfDownloadError] = useState<string | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);

  const webCacheDataId = 'ppc-202607241309';
  const cacheKey = `ppc-settings-${editionKey ?? 'ppc-setting-default'}`;
  const webCache = new WebStorageKeyCache('local', webCacheDataId, editionKey ?? 'default');

  useEffect(() => {
    if (edition === null) {
      return;
    }
    const styleSheets = SystemStyleSheet.getStyleSheetsForLanguage(edition.lang);
    setSystemStyles(styleSheets);
    if (styleSheetId === null) {
      setStyleSheetId(Object.keys(styleSheets)[0]);
    }
  }, [edition]);

  useEffect(() => {
    setPreviewUpToDate(false);
    setPdfDownloadUrl(null);
    setRefreshingPreview(false);
  }, [styleSheetId, edition]);


  /**
   * Save styleSheetId to settings
   */
  useEffect(() => {
    if (edition === null) {
      return;
    }
    if (styleSheetId !== null) {
      const currentSettings = webCache.retrieve(cacheKey) as PreviewPanelSettings | null;
      if (currentSettings !== null) {
        if (currentSettings.styleSheetId !== styleSheetId) {
          // console.log(`Settings ${editionKey}: updating styleSheetId from ${currentSettings.styleSheetId} to ${styleSheetId}`);
          webCache.store(cacheKey, {...currentSettings, styleSheetId});
        }
      } else {
        // console.log(`Settings ${editionKey}: saving styleSheetId ${styleSheetId} for the first time`);
        webCache.store(cacheKey, {styleSheetId});
      }
    } else {
      // console.log('styleSheetId is null');
      const currentSettings = webCache.retrieve(cacheKey) as PreviewPanelSettings | null;
      if (currentSettings !== null) {
        // console.log(`Settings ${editionKey}: setting stylesheeId to ${currentSettings.styleSheetId} from cached settings`);
        setStyleSheetId(currentSettings.styleSheetId);
      }
    }
  }, [edition, styleSheetId]);

  if (edition === null || systemStyles === null) {
    return <Panel className={'preview-panel no-edition'}>
      <p>No edition to preview yet</p>
    </Panel>;
  }


  const doTypeset = async () => {
    if (edition === null) {
      // console.log('Edition is null, no typesetting necessary');
      return null;
    }

    if (styleSheetId === null) {
      // console.log('styleSheetId is null, no typesetting possible');
      return null;
    }

    const editionObject = (new Edition()).setFromInterface(edition);
    const styleSheet = SystemStyleSheet.getStyleSheet(edition.lang, styleSheetId);
    // Load fonts
    // console.log(`Loading fonts`);
    let fontsToLoad: string[] = [];
    styleSheet.getFontFamilies().forEach((fontFamily) => {
      fontsToLoad.push(`1em ${fontFamily}`, `bold 1em ${fontFamily}`, `italic 1em ${fontFamily}`, `bold italic 1em ${fontFamily}`);
    });

    for (let i = 0; i < fontsToLoad.length; i++) {
      await document.fonts.load(fontsToLoad[i]);
      // console.log(` Loaded ${fontsToLoad[i]} `);
    }

    return getTypesetEdition(editionObject, styleSheet, styleSheetId);
  };

  const handleClickOnRefresh = async () => {
    setPreviewUpToDate(false);
    setRefreshingPreview(true);
    await nextTick();
    try {
      const newlyTypesetEdition = await doTypeset();
      if (newlyTypesetEdition !== null) {
        setPage(Math.min(page, newlyTypesetEdition.getPageCount() - 1));
      }
      setTypesetEdition(newlyTypesetEdition);
      setPreviewUpToDate(true);
    } catch (error) {
      console.warn('Error refreshing preview', error);
      setPreviewUpToDate(false);
    } finally {
      setRefreshingPreview(false);
    }
  };

  const handleOnClickDownloadPDF = async () => {
    if (edition === null) {
      return null;
    }

    if (styleSheetId === null) {
      return null;
    }

    if (pdfDownloadUrl !== null) {
      setDownloadingPDF(false);
      setPdfDownloadError(null);
      window.open(pdfDownloadUrl);
      return;
    }

    setDownloadingPDF(true);
    setPdfDownloadError(null);
    await nextTick();
    try {
      const editionObject = (new Edition()).setFromInterface(edition);
      const styleSheet = SystemStyleSheet.getStyleSheet(edition.lang, styleSheetId);
      const apiRequestData = await getApiPdfData(editionObject, styleSheet, styleSheetId);
      const pdfUrl = await getPdfUrl(apiRequestData);
      // console.log(`PDF url: ${pdfUrl}`);
      setPdfDownloadUrl(pdfUrl);
      window.open(pdfUrl);
    } catch (e) {
      console.warn(`Error getting PDF url from server`, e);
      setPdfDownloadError('Error');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const styleSheetSelect = <select value={styleSheetId ?? undefined}
                                   onChange={e => setStyleSheetId(e.target.value)}>
    {Object.keys(systemStyles).map((id) => <option key={id} value={id}>{systemStyles[id]._metaData.name}</option>)}
  </select>;

  return <Panel className={'preview-panel'}>
    <Toolbar>
      <div className={'toolbar-group'}>
        <div>Style: {styleSheetSelect}</div>
      </div>
      <div className={'toolbar-group center'}>
        {typesetEdition !== null &&
          <PreviewPageControls page={page} totalPages={typesetEdition.getPageCount()} onChange={(p) => setPage(p)}/>}
      </div>
      <div className={'toolbar-group center'}>
        {typesetEdition !== null && <PreviewZoomControls zoom={zoom} onChange={(z) => setZoom(z)}/>}
      </div>
      <div className={'toolbar-group right'}>
        {!previewUpToDate &&
          <ComponentWithPending pending={refreshingPreview}
                                pendingElement={<span>Refreshing preview... <Spinner size={'sm'}/></span>}>
            <span className={'tb-btn'} onClick={handleClickOnRefresh}
                  title={'Click to refresh preview'}>Out of date <ArrowClockwise/></span>
          </ComponentWithPending>}
        {previewUpToDate && <ComponentWithPending pending={downloadingPDF}
                                                  pendingElement={<span>Generating PDF... <Spinner
                                                    size={'sm'}/></span>}>
          <div onClick={() => handleOnClickDownloadPDF()} className={'tb-btn'}
               title={pdfDownloadUrl === null ? 'Click to generate PDF in server' : 'Download PDF'}>
            {pdfDownloadError &&
              <span className={'text-danger'} style={{marginRight: '1em'}}>PDF generation failed</span>}
            <small>PDF</small><Download/>
          </div>
        </ComponentWithPending>}
      </div>
    </Toolbar>
    <PanelContent>
      <TypesetterDocumentViewer doc={typesetEdition} zoom={zoom} page={page}
                                placeHolder={<div className={'placeholder'}>Click on the <ArrowClockwise/> icon above to
                                  refresh the preview</div>}/>
    </PanelContent>
  </Panel>;
}