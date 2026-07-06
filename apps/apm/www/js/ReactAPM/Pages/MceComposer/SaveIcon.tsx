import {CloudArrowUp} from "react-bootstrap-icons";
import Popover from "react-bootstrap/Popover";
import {OverlayTrigger} from "react-bootstrap";


interface SaveIconProps {
  changes: string[]
}

export default function SaveIcon({ changes }: SaveIconProps) {
  if (changes.length > 0) {
    changes.join('\n');
    const popover = (
      <Popover className={'save-changes-popover'}>
        <Popover.Header as="h3">Save changes</Popover.Header>
        <Popover.Body>
          <p>There are unsaved changes:</p>
          <ul>
            {changes.map((change, index) => <li key={index}>{change}</li>)}
          </ul>
        </Popover.Body>
      </Popover>
    );
    return <OverlayTrigger overlay={popover}
                           placement={'auto-end'}
                           trigger={['hover', 'focus']}>
      <CloudArrowUp className={'tb-icon tb-icon-active'}/>
    </OverlayTrigger>;
  }
  return <CloudArrowUp className={'tb-icon tb-icon-disabled'} title={'Nothing to save'}/>;
}