import {ZoomIn, ZoomOut} from "react-bootstrap-icons";

interface PreviewZoomControlsProps {
  zoom: number;
  onChange: (zoom: number) => void;
}


export default function PreviewZoomControls({zoom, onChange}: PreviewZoomControlsProps) {

  const toPercentage = (z: number) => Math.round(z * 100);
  const zoomSteps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const closestZoom = zoomSteps.reduce((prev, curr) => Math.abs(curr - zoom) < Math.abs(prev - zoom) ? curr : prev);
  const currentZoomStep = zoomSteps.findIndex(z => z === closestZoom) ?? 3;

  return <>
    <div><ZoomOut onClick={() => currentZoomStep !== 0 && onChange(zoomSteps[currentZoomStep - 1])}/></div>

    <div>Zoom <select value={closestZoom} onChange={(e) => onChange(Number(e.target.value))}>{
      zoomSteps.map(z => <option key={z} value={z}>{toPercentage(z)}%</option>)
    }</select></div>
    <div><ZoomIn onClick={() => currentZoomStep !== zoomSteps.length - 1 && onChange(zoomSteps[currentZoomStep + 1])}/>
    </div>
  </>;
}