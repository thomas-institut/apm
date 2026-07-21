import {TypesetterDocument} from "@thomas-inst/typesetter";
import React from "react";


interface TypesetterDocumentViewer {
  doc: TypesetterDocument | null
  zoom: number,
  page: number,
  className?: string,
  style?: React.CSSProperties,
}


export default function TypesetterDocumentViewer({doc, zoom, page, className}: TypesetterDocumentViewer) {

  let classes = 'doc-viewer';
  if (className)
    classes += ' ' + className;

  return <div className={classes}>
    {doc === null && 'Waiting for TypesetDocument '}
    {doc !== null && (
      <>
        TypesetDocumentViewer zoom {zoom} page {page + 1}
      </>
    )}

  </div>;
}