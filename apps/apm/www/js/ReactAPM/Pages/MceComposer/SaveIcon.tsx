import {CloudArrowUp} from "react-bootstrap-icons";


interface SaveIconProps {
  changes: string[]
}

export default function SaveIcon({ changes }: SaveIconProps) {
  if (changes.length > 0) {
    const title = changes.join('\n');
    return <CloudArrowUp className={'tb-icon tb-icon-active'} title={title}/>;
  }
  return <CloudArrowUp className={'tb-icon tb-icon-disabled'} title={'Nothing to save'}/>;
}