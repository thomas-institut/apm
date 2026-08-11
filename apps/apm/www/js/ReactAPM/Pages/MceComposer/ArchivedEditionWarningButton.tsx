import {ExclamationTriangleFill} from "react-bootstrap-icons";
import {OverlayTrigger, Popover} from "react-bootstrap";
import {OverlayInjectedProps} from "react-bootstrap/types";

export default function ArchivedEditionWarningButton() {
  const popover = (popoverProps: OverlayInjectedProps) => (
    <Popover {...popoverProps} id="archived-edition-popover" className="archived-edition-popover">
      <Popover.Header className={'text-danger'}><ExclamationTriangleFill/> Archived Edition!</Popover.Header>
      <Popover.Body>
        <p>This edition is archived.</p>
        <p>Archived editions cannot be edited or saved.</p>
      </Popover.Body>
    </Popover>
  );

  return <OverlayTrigger placement="bottom" overlay={popover}>
    <ExclamationTriangleFill className={'text-danger icon-btn'} style={{fontSize: '1.2em'}}/>
  </OverlayTrigger>;
}