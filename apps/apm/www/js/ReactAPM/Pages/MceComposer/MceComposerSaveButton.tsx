import {CloudArrowUp} from "react-bootstrap-icons";
import Popover from "react-bootstrap/Popover";
import {OverlayTrigger} from "react-bootstrap";


interface SaveButtonProps {
  changes: string[],
  onClick: () => void | Promise<void>,
  saveError: string | null
}

export default function MceComposerSaveButton({changes, onClick, saveError}: SaveButtonProps) {
  if (changes.length > 0) {
    changes.join('\n');
    const popover = (
      <Popover className={'save-changes-popover'}>
        <Popover.Header>Save changes</Popover.Header>
        <Popover.Body>
          { saveError !== null && <p className={'notice text-danger'}>{saveError === '' ? 'An error occurred' : saveError}. Please try saving again!</p> }
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
      {
        saveError !== null ?
          <CloudArrowUp className={'icon-btn text-danger'} onClick={onClick}/> :
          <CloudArrowUp className={'icon-btn highlighted'} onClick={onClick}/>
      }
    </OverlayTrigger>;
  }
  return <CloudArrowUp className={'icon-btn disabled'} title={'Nothing to save'}/>;
}