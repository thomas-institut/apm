import {ReactNode, useState} from "react";
import {CaretDownFill, CaretRightFill} from "react-bootstrap-icons";

interface CollapsibleProps {
  title: string;
  startOpen?: boolean;
  children?: ReactNode;
  containerClassName?: string;
  contentClassName?: string;
}

export default function CollapsibleDiv(props: CollapsibleProps) {
  const { title, startOpen} = props;

  const containerClassName = props.containerClassName ?? "collapsible-container";
  const contentClassName = props.contentClassName ?? "collapsible-content";

  const [isOpen, setIsOpen] = useState(startOpen ?? true);
  const toggleOpen = () => setIsOpen(!isOpen);
  const togglersStyle = {
    cursor: 'pointer',
    verticalAlign: 'middle',
    color: '#122894'
  }


  return(<div className={containerClassName}>
      <h1>{title} {
        isOpen ?
          <CaretDownFill style={togglersStyle} onClick={toggleOpen}/> :
          <CaretRightFill style={togglersStyle} onClick={toggleOpen}/>}</h1>
      { isOpen && <div className={contentClassName}>{props.children}</div>}
    </div>
  );

}