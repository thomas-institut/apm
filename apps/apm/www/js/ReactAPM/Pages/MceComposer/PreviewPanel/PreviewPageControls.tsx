import {ChevronBarLeft, ChevronBarRight, ChevronLeft, ChevronRight} from "react-bootstrap-icons";


interface PreviewPageControlsProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}


export default function PreviewPageControls({page, totalPages, onChange}: PreviewPageControlsProps) {

  const classNameNormal = 'tb-btn';
  const classNameDisabled = 'tb-btn disabled';

  return <>
    <ChevronBarLeft className={page === 0 ? classNameDisabled : classNameNormal} title="First Page" onClick={() => onChange(0)}/>
    <ChevronLeft className={page === 0 ? classNameDisabled : classNameNormal} title="Previous Page" onClick={() => page !== 0 && onChange(page - 1)}/>
    <div>Page <select value={page} onChange={(e) => onChange(parseInt(e.target.value))}>
      {[...Array(totalPages)].map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select></div>
    <ChevronRight className={page === totalPages - 1 ? classNameDisabled : classNameNormal} title="Next Page" onClick={() => page !== totalPages - 1 && onChange(page + 1)}/>
    <ChevronBarRight className={page === totalPages - 1 ? classNameDisabled : classNameNormal} title="Last Page" onClick={() => onChange(totalPages - 1)}/>
  </>;
}