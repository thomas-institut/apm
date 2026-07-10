import {CloudArrowUp} from "react-bootstrap-icons";
import Popover from "react-bootstrap/Popover";
import {OverlayTrigger} from "react-bootstrap";


interface SaveButtonProps {
  changes: string[]
}

export default function SaveButton({ changes }: SaveButtonProps) {
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
      <CloudArrowUp className={'icon-btn highlighted'}/>
    </OverlayTrigger>;
  }
  return <CloudArrowUp className={'icon-btn disabled'} title={'Nothing to save'}/>;
}