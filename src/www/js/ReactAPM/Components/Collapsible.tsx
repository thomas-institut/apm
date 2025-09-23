import {CSSProperties, ReactNode, useState} from "react";
import {CaretDownFill, CaretRight, CaretRightFill, ChevronRight} from "react-bootstrap-icons";

interface CollapsibleProps {
  header: ReactNode;
  startOpen?: boolean;
  children?: ReactNode;
  className?: string;
}

export default function Collapsible(props: CollapsibleProps) {
  const {header, className, startOpen} = props;


  const [isOpen, setIsOpen] = useState(startOpen ?? true);
  const toggleOpen = () => setIsOpen(!isOpen);
  const togglersStyle = {
    cursor: 'pointer', color: 'var(--link-color)'
  };

  const containerStyle: CSSProperties = {
    display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.25em',
  };


  return (<>
      <div style={containerStyle} className={className}>
        {header}
        {isOpen ? <CaretDownFill style={togglersStyle} onClick={toggleOpen}/> :
          <CaretRightFill style={togglersStyle} onClick={toggleOpen}/>}
      </div>
      {isOpen && props.children}
    </>);
}