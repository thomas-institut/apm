import {ChevronBarLeft, ChevronBarRight, ChevronLeft, ChevronRight} from "react-bootstrap-icons";


interface PreviewPageControlsProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}


export default function PreviewPageControls({page, totalPages, onChange}: PreviewPageControlsProps) {

  return <>
    <ChevronBarLeft onClick={() => onChange(0)}/>
    <ChevronLeft onClick={() => page !== 0 && onChange(page - 1)}/>
    <div>Page <select value={page} onChange={(e) => onChange(parseInt(e.target.value))}>
      {[...Array(totalPages)].map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></div>
    <ChevronRight onClick={() => page !== totalPages - 1 && onChange(page + 1)}/>
    <ChevronBarRight onClick={() => onChange(totalPages - 1)}/>
  </>;
}