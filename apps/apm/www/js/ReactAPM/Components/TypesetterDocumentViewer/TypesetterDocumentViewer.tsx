import {TypesetterDocument} from "@thomas-inst/typesetter";
import React, {useEffect, useRef} from "react";
import {PagedCanvasRenderer} from "@/ReactAPM/Components/TypesetterDocumentViewer/PagedCanvasRenderer";
import './TypesetterDocumentViewer.css';
import {BrowserUtilities} from "@/toolbox/BrowserUtilities";


interface TypesetterDocumentViewer {
  doc: TypesetterDocument | null
  zoom: number,
  page: number,
  className?: string,
  style?: React.CSSProperties,
}


export default function TypesetterDocumentViewer({doc, zoom, page, className}: TypesetterDocumentViewer) {

  let classes = 'doc-viewer';
  if (className) {
    classes += ' ' + className;
  }

  const canvasElement = useRef<HTMLCanvasElement>(null);
  const canvasRenderer = useRef<PagedCanvasRenderer|null>(null);

  useEffect(() => {
    if (canvasElement.current === null) {
      return;
    }
    if (canvasRenderer.current === null) {
      canvasRenderer.current = new PagedCanvasRenderer(canvasElement.current);
    }
    if (doc === null) {
      return;
    }
    canvasRenderer.current.setCurrentPage(page);
    canvasRenderer.current.setScale(zoom);
    const [width, height] = canvasRenderer.current.getCanvasDimensionsForDoc(doc);
    BrowserUtilities.setCanvasHiPDI(canvasElement.current, width, height);
    canvasRenderer.current.renderDocument(doc);
  }, [doc, page, zoom]);

  if (doc===null) {
    return <div className={classes}>Waiting for TypesetDocument</div>;
  }

  return  <canvas ref={canvasElement}></canvas>;
}