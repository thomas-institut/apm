import {CloudArrowUp} from "react-bootstrap-icons";
import Popover from "react-bootstrap/Popover";
import {OverlayTrigger} from "react-bootstrap";


interface SaveButtonProps {
  changes: string[]
}

export default function MceComposerSaveButton({ changes }: SaveButtonProps) {
  if (changes.length > 0) {
    changes.join('\n');
    const popover = (
      <Popover className={'save-changes-popover'}>
        <Popover.Header>Save changes</Popover.Header>
        <Popover.Body>
          <p className={'notice'}>There are unsaved changes:</p>
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