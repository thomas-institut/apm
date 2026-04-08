import {randomAlphaString} from "@/toolbox/ToolBox";
import React, {useEffect, useRef} from "react";
import OpenSeadragon from 'openseadragon';


interface OsdViewerProps {
  url: string;
  isDeepZoom?: boolean;
  iconsPrefix?: string;
  onOpen?: () => void;
}

export default function OsdViewer(props: OsdViewerProps) {
  const divId = useRef(randomAlphaString(20));
  const osdInstance = useRef<OpenSeadragon.Viewer>(null);
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current && !osdInstance.current) {
      const tileSource = props.isDeepZoom ? props.url : {
        type: 'image',
        url: props.url,
      };

      osdInstance.current = OpenSeadragon({
        element: divRef.current,
        prefixUrl: props.iconsPrefix ?? 'https://openseadragon.github.io/openseadragon/images/',
        minZoomLevel: 0.4,
        maxZoomLevel:5,
        showRotationControl: true,
        tileSources: tileSource,
        preserveImageSizeOnResize: true
      });
      if (props.onOpen) {
        osdInstance.current.addHandler('open', props.onOpen);
      }
    }
    return () => {
      if (osdInstance.current) {
        osdInstance.current.destroy();
        osdInstance.current = null;
      }
    }
  })

  return <div id={divId.current} style={{width: '100%', height: '100%'}} ref={divRef}></div>
}