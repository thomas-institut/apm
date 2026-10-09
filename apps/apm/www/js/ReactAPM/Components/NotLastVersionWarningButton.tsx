import {ExclamationTriangleFill} from "react-bootstrap-icons";
import {OverlayTrigger, Popover} from "react-bootstrap";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {OverlayInjectedProps} from "react-bootstrap/types";

interface NotLastVersionWarningButtonProps {
  label?: string;
  version: string | null;
  className?: string;
}

export default function NotLastVersionWarningButton({version, label, className}: NotLastVersionWarningButtonProps) {
  if (version === null)
    return null;

  const popover = (popoverProps: OverlayInjectedProps) => (
    <Popover {...popoverProps} id="not-last-version-popover" className="not-last-version-popover">
      <Popover.Header className={'text-danger'}><ExclamationTriangleFill/> Outdated Version!</Popover.Header>
      <Popover.Body>
        <p>This is not the last version of this edition.</p>
        <p>This version was saved on <b>{ApmFormats.time(version)}</b> ({ApmFormats.timeAgo(version)})</p>
        <p>Proceed with caution.</p>
      </Popover.Body>
    </Popover>
  );
  return <OverlayTrigger placement="bottom" overlay={popover}>
    <span className={className}>
      <ExclamationTriangleFill className={'text-danger icon-btn'} style={{fontSize: '1.2em'}}/>
      {label ? <span className={'text-danger'} style={{marginLeft: '0.25em'}}>{label}</span> : null}
    </span>
  </OverlayTrigger>;
}