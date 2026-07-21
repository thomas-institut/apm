import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {EditionInterface} from "@/Edition/EditionInterface";
import './PreviewPanel.css';
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import {ArrowClockwise,} from "react-bootstrap-icons";
import {useEffect, useState} from "react";
import {SystemStyles, SystemStyleSheet} from "@/defaults/EditionStyles/SystemStyleSheet";
import TypesetterDocumentViewer from "@/ReactAPM/Components/TypesetterDocumentViewer/TypesetterDocumentViewer";
import {TypesetterDocument} from "@thomas-inst/typesetter";
import {Edition} from "@/Edition/Edition";
import {getTypesetEdition} from "@/ReactAPM/Pages/MceComposer/EditionTypesetter";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";
import PreviewPageControls from "@/ReactAPM/Pages/MceComposer/PreviewPageControls";
import PreviewZoomControls from "@/ReactAPM/Pages/MceComposer/PreviewZoomControls";
import {Spinner} from "react-bootstrap";

interface PreviewPanelProps extends TabbableElementProps {
  edition: EditionInterface | null;
}

export default function PreviewPanel({edition}: PreviewPanelProps) {

  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [typesetEdition, setTypesetEdition] = useState<null | TypesetterDocument>(null);
  const [styleSheetId, setStyleSheetId] = useState<string | null>(null);
  const [systemStyles, setSystemStyles] = useState<SystemStyles | null>(null);
  const [previewUpToDate, setPreviewUpToDate] = useState(false);
  const [refreshingPreview, setRefreshingPreview] = useState(false);

  useEffect(() => {
    if (edition === null) {
      return;
    }
    const styleSheets = SystemStyleSheet.getStyleSheetsForLanguage(edition.lang);
    const styleSheetIds = Object.keys(styleSheets);
    setSystemStyles(styleSheets);
    setStyleSheetId(styleSheetIds[0]);
  }, [edition?.lang]);

  useEffect(() => {
    setPreviewUpToDate(false);
    setRefreshingPreview(false);
  }, [styleSheetId, edition]);

  if (edition === null || systemStyles === null) {
    return <Panel className={'preview-panel'}>
      Edition not ready yet...
    </Panel>;
  }


  const doTypeset = async () => {
    if (edition === null) {
      return null;
    }

    if (styleSheetId === null) {
      return null;
    }

    const editionObject = (new Edition()).setFromInterface(edition);
    const styleSheet = SystemStyleSheet.getStyleSheet(edition.lang, styleSheetId);
    // Load fonts
    console.log(`Loading fonts`);
    let fontsToLoad: string[] = [];
    styleSheet.getFontFamilies().forEach((fontFamily) => {
      fontsToLoad.push(`1em ${fontFamily}`, `bold 1em ${fontFamily}`, `italic 1em ${fontFamily}`, `bold italic 1em ${fontFamily}`);
    });

    for (let i = 0; i < fontsToLoad.length; i++) {
      await document.fonts.load(fontsToLoad[i]);
      console.log(` Loaded ${fontsToLoad[i]} `);
    }

    return getTypesetEdition(editionObject, styleSheet);
  };

  const handleClickOnRefresh = async () => {
    setPreviewUpToDate(false);
    setRefreshingPreview(true);
    setTimeout(async () => {
      const newlyTypesetEdition = await doTypeset();
      if (newlyTypesetEdition !== null) {
        setPage(Math.min(page, newlyTypesetEdition.getPageCount() - 1));
      }
      setTypesetEdition(newlyTypesetEdition);
      setRefreshingPreview(false);
      setPreviewUpToDate(true);

    }, 0);
  };

  const styleSheetSelect = <select defaultValue={styleSheetId ?? undefined}
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
        {previewUpToDate && <div>PDF</div>}
      </div>
    </Toolbar>
    <PanelContent>
      <TypesetterDocumentViewer doc={typesetEdition} zoom={zoom} page={page}
                                placeHolder={<div className={'placeholder'}>Click on the <ArrowClockwise/> icon above to
                                  refresh the preview</div>}/>
    </PanelContent>
  </Panel>;
}