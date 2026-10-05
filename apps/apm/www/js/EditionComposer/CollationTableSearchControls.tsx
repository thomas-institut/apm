interface CollationTableSearchControlsProps {
  visible: boolean;
  query: string;
  matchCount: number;
  selectedMatch: number;
  textDirection: string;
  onQueryChange: (query: string) => void;
  onNavigate: (direction: -1 | 1) => void;
}

export default function CollationTableSearchControls(props: CollationTableSearchControlsProps) {
  if (!props.visible) {
    return null;
  }
  return <div className="panel-toolbar-group">
    <input type="search" className="panel-toolbar-item" aria-label="Search collation table" placeholder="Search table"
           dir={props.textDirection} value={props.query}
           onChange={event => props.onQueryChange(event.target.value)}/>
    {props.matchCount > 0 && <>
      <span className="panel-toolbar-item" role="status" aria-live="polite">
        {props.selectedMatch >= 0 ? `${props.selectedMatch + 1} / ${props.matchCount}` : `${props.matchCount} matches`}
      </span>
      <button type="button" className="tb-button" title="Previous match" aria-label="Previous match"
              onClick={() => props.onNavigate(-1)}>
        <i className="fas fa-chevron-left"/>
      </button>
      <button type="button" className="tb-button" title="Next match" aria-label="Next match"
              onClick={() => props.onNavigate(1)}>
        <i className="fas fa-chevron-right"/>
      </button>
    </>}
  </div>;
}