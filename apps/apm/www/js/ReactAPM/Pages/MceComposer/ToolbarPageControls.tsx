import {ChevronBarLeft, ChevronBarRight, ChevronLeft, ChevronRight} from "react-bootstrap-icons";


interface ToolbarPageControlsProps {
  page: number;
  totalPages: number;
  labels?: string[];
  onChange: (page: number) => void;
}


export default function ToolbarPageControls({page, totalPages, labels, onChange}: ToolbarPageControlsProps) {

  const classNameNormal = 'tb-btn';
  const classNameDisabled = 'tb-btn disabled';

  return <>
    <span data-page-control="first" onClick={() => onChange(0)}><ChevronBarLeft className={page === 0 ? classNameDisabled : classNameNormal} title="First Page"/></span>
    <span data-page-control="previous" onClick={() => page !== 0 && onChange(page - 1)}><ChevronLeft className={page === 0 ? classNameDisabled : classNameNormal} title="Previous Page"/></span>
    <div><select value={page} onChange={(e) => onChange(parseInt(e.target.value))}>
      {[...Array(totalPages)].map((_, i) => <option key={i} value={i}>{labels?.[i] ?? `Page ${i + 1}`}</option>)}</select></div>
    <span data-page-control="next" onClick={() => page !== totalPages - 1 && onChange(page + 1)}><ChevronRight className={page === totalPages - 1 ? classNameDisabled : classNameNormal} title="Next Page"/></span>
    <span data-page-control="last" onClick={() => onChange(totalPages - 1)}><ChevronBarRight className={page === totalPages - 1 ? classNameDisabled : classNameNormal} title="Last Page"/></span>
  </>;
}