import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {EditionInterface} from "@/Edition/EditionInterface";
import './PreviewPanel.css';
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import {
  ArrowClockwise,
  ChevronBarLeft,
  ChevronBarRight,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from "react-bootstrap-icons";
import {useEffect, useState} from "react";
import {SystemStyles, SystemStyleSheet} from "@/defaults/EditionStyles/SystemStyleSheet";
import TypesetterDocumentViewer from "@/ReactAPM/Components/TypesetterDocumentViewer";
import {TypesetterDocument} from "@thomas-inst/typesetter";
import {Edition} from "@/Edition/Edition";
import {getTypesetEdition} from "@/ReactAPM/Pages/MceComposer/EditionTypesetter";
import ComponentWithPending from "@/ReactAPM/Components/ComponentWithPending";

interface PreviewPanelProps extends TabbableElementProps {
  edition: EditionInterface | null;
}

export default function PreviewPanel({edition}: PreviewPanelProps) {

  const [page, setPage] = useState(1);
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
  const zoomInPercentage = Math.round(zoom * 100);


  const doTypeset = async () => {
    if (edition === null) {
      return null;
    }

    if (styleSheetId === null) {
      return null;
    }

    const editionObject = (new Edition()).setFromInterface(edition);
    const styleSheet = SystemStyleSheet.getStyleSheet(edition.lang, styleSheetId);

    return getTypesetEdition(editionObject, styleSheet);
  };

  const handleClickOnRefresh = async () => {
    setPreviewUpToDate(false);
    setRefreshingPreview(true);
    setTimeout(async () => {
      setTypesetEdition(await doTypeset());
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
        <ChevronBarLeft/>
        <ChevronLeft/>
        <div>Page {page}</div>
        <ChevronRight/>
        <ChevronBarRight/>
      </div>
      <div className={'toolbar-group center'}>
        <div>Zoom {zoomInPercentage}%</div>
        <div><ZoomIn/></div>
        <div><ZoomOut/></div>
      </div>
      <div className={'toolbar-group right'}>
        {!previewUpToDate && <ComponentWithPending pending={refreshingPreview}>Out of date <ArrowClockwise className={'tb-button'}
                                                                                               onClick={handleClickOnRefresh}/></ComponentWithPending>}
        {previewUpToDate && <div>PDF</div>}
      </div>
    </Toolbar>
    <PanelContent>
      <TypesetterDocumentViewer doc={typesetEdition} zoom={zoom} page={page}/>
    </PanelContent>
  </Panel>;
}