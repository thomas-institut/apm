import {ExclamationTriangleFill} from "react-bootstrap-icons";
import {OverlayTrigger, Popover} from "react-bootstrap";
import {ApmFormats} from "@/pages/common/ApmFormats";

interface NotLastVersionWarningButtonProps {
  version: string | null;
}

export default function NotLastVersionWarningButton({version}: NotLastVersionWarningButtonProps) {
  if (version === null)
    return null;

  const popover = (
    <Popover id="not-last-version-popover" className="not-last-version-popover">
      <Popover.Header className={'text-danger'}><ExclamationTriangleFill/> Outdated Version!</Popover.Header>
      <Popover.Body>
        <p>This is not the last version of this edition.</p>
        <p>This version was saved on <b>{ApmFormats.time(version)}</b> ({ApmFormats.timeAgo(version)})</p>
        <p>Proceed with caution.</p>
      </Popover.Body>
    </Popover>
  );
  return <OverlayTrigger placement="bottom" overlay={popover}>
    <ExclamationTriangleFill className={'text-danger icon-btn'} style={{fontSize: '1.2em'}}/>
  </OverlayTrigger>
}