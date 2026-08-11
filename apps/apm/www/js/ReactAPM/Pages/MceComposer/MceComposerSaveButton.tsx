import {CloudArrowUp} from "react-bootstrap-icons";
import Overlay from "react-bootstrap/Overlay";
import Popover from "react-bootstrap/Popover";
import {Button, Form, OverlayTrigger} from "react-bootstrap";
import {useRef, useState} from "react";
import {nextTick} from "@/ReactAPM/ToolBox/NextTick";


interface SaveButtonProps {
  changes: string[],
  executeSave: (description: string) => void | Promise<void>,
  saveError: string | null,
  disabled?: boolean,
}

export default function MceComposerSaveButton({changes, executeSave, saveError, disabled = false}: SaveButtonProps) {


  const [saving, setSaving] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [description, setDescription] = useState('');
  const saveButtonRef = useRef<SVGSVGElement>(null);
  const handleConfirmationOpen = () => {
    if (disabled || saving) {
      return;
    }
    setDescription(changes.join('. '));
    setConfirmationOpen(true);
  };

  const handleSave = async () => {
    if (saving || description.trim().length < 10) {
      return;
    }
    setConfirmationOpen(false);
    setSaving(true);
    await nextTick();
    try {
      await executeSave(description);
    } catch (e) {
      console.warn(`Unexpected error`, e);
    } finally {
      setSaving(false);
    }
  };

  if (changes.length > 0 && !disabled) {
    const changesPopover = (
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
    const confirmationPopover = (
      <Popover className={'save-confirmation-popover'}>
        <Popover.Header className={'text-primary'}>Save changes</Popover.Header>
        <Popover.Body>
          <p className={'notice'}>Do you want to save?</p>
          <p>Confirm or edit changes made:</p>
          <Form.Control as={'textarea'}
                        rows={3}
                        size={'sm'}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}/>
          <div className={'save-confirmation-actions'}>
            <Button size={'sm'} variant={'primary'} onClick={handleSave} disabled={description.trim().length < 10}>Save</Button>
            <Button size={'sm'} variant={'secondary'} onClick={() => setConfirmationOpen(false)}>Cancel</Button>
          </div>
        </Popover.Body>
      </Popover>
    );

    return <>
      <OverlayTrigger overlay={changesPopover}
                      placement={'bottom'}
                      trigger={['hover', 'focus']}
                      show={confirmationOpen || saving ? false : undefined}>
        {
          saveError !== null ?
            // @ts-ignore Bootstrap icons seem to be missing type definitions for ref
            <CloudArrowUp ref={saveButtonRef} className={'icon-btn text-danger'} onClick={handleConfirmationOpen}/> :
            // @ts-ignore
            <CloudArrowUp ref={saveButtonRef} className={'icon-btn highlighted'} onClick={handleConfirmationOpen}/>
        }
      </OverlayTrigger>
      <Overlay show={confirmationOpen && !saving}
               target={saveButtonRef.current}
               placement={'bottom-end'}
               rootClose
               onHide={() => setConfirmationOpen(false)}>
        {confirmationPopover}
      </Overlay>
    </>;
  }
  return <CloudArrowUp className={'icon-btn disabled'} title={disabled ? 'Edition is archived' : 'Nothing to save'}/>;
}