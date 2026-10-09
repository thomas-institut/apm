import {OverlayTrigger, Popover} from "react-bootstrap";
import {BugFill} from "react-bootstrap-icons";


interface BugWarningButtonProps {
  foundBugDescription: string;
}

export default function BugWarningButton({foundBugDescription}: BugWarningButtonProps) {

  const bugPopover = (
    <Popover id="bug-popover" className="bug-popover">
      <Popover.Header>Oops!</Popover.Header>
      <Popover.Body>
        <p>You have discovered a bug in the software! Please click <a
          href={'https://github.com/thomas-institut/apm/issues/new'} target="_blank">here to report it on Github</a>.
        </p>
        <p>Include the following description:</p>
        <p className={'bug-description'}>{foundBugDescription}</p>
        <p>Be sure to include the following information as well:</p>
        <ul>
          <li>What you were doing when the bug occurred.</li>
          <li>A screenshot of the History Panel</li>
          <li>If possible, error messages or logs from the Developer Tools</li>
        </ul>
      </Popover.Body>
    </Popover>
  );

  return  <OverlayTrigger trigger={['click']} placement="bottom" overlay={bugPopover}>
    <BugFill className={'icon-btn bug-icon'} title={`A bug was found, click here for more information`}/>
  </OverlayTrigger>
}