import {TypesetterDocument} from "@thomas-inst/typesetter";
import React, {JSX, useEffect, useRef} from "react";
import {PagedCanvasRenderer} from "@/ReactAPM/Components/TypesetterDocumentViewer/PagedCanvasRenderer";
import './TypesetterDocumentViewer.css';
import {BrowserUtilities} from "@/toolbox/BrowserUtilities";


interface TypesetterDocumentViewer {
  doc: TypesetterDocument | null
  zoom: number,
  page: number,
  placeHolder?: JSX.Element
}


export default function TypesetterDocumentViewer({doc, zoom, page, placeHolder}: TypesetterDocumentViewer) {


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
    canvasRenderer.current.setCurrentPage(Math.min(page, doc.getPageCount() -1 ));
    canvasRenderer.current.setScale(zoom);
    const [width, height] = canvasRenderer.current.getCanvasDimensionsForDoc(doc);
    BrowserUtilities.setCanvasHiPDI(canvasElement.current, width, height);
    canvasRenderer.current.renderDocument(doc);
  }, [doc, page, zoom]);

  if (doc===null) {
    return placeHolder ?? <div>Waiting for TypesetDocument</div>;
  }

  return  <canvas ref={canvasElement}></canvas>;
}