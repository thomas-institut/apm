import {Button, Modal} from "react-bootstrap";
import {ReactNode} from "react";

interface ConfirmDialogProps {
  show: boolean;
  onHide: () => void;
  onAccept: () => void;
  onCancel?: () => void;
  title?: string;
  body: ReactNode;
  acceptButtonLabel?: string;
  cancelButtonLabel?: string;
  size?: 'sm' | 'lg' | 'xl';
}

/**
 * A generic confirmation dialog component based on the legacy ConfirmDialog.
 */
export default function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    show,
    onHide,
    onAccept,
    onCancel,
    title = 'Please confirm',
    body,
    acceptButtonLabel = 'Accept',
    cancelButtonLabel = 'Cancel',
    size = 'lg'
  } = props;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onHide();
  };

  const handleAccept = () => {
    onAccept();
    onHide();
  };

  return (<Modal show={show} onHide={handleCancel} size={size}>
    <Modal.Header closeButton>
      <Modal.Title>{title}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {body}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="danger" onClick={handleAccept} className="accept-btn">
        {acceptButtonLabel}
      </Button>
      <Button variant="primary" onClick={handleCancel} className="cancel-btn">
        {cancelButtonLabel}
      </Button>
    </Modal.Footer>
  </Modal>);
}
