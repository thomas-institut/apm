import {PlusLg} from "react-bootstrap-icons";
import {Button} from "react-bootstrap";

interface AddSubEntryButtonProps {
  onClick: () => void;
}

/**
 * The "+" icon shown (via CSS) when hovering the last sub-entry of an entry
 */
export default function AddSubEntryButton({onClick}: AddSubEntryButtonProps) {
  return <Button className="quick-add-sub-entry" aria-label="Add sub-entry" title="Add sub-entry"
                 onClick={(event) => {
                   event.stopPropagation();
                   event.preventDefault();
                   onClick();
                 }}><PlusLg/></Button>;
}
