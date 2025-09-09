import {RefObject, useState} from "react";

interface AnchorListProps {
  contentRef: RefObject<HTMLElement | null>;
  anchorsRefs: RefObject<HTMLElement | null>[];
  anchorTitles: string[];
  className?: string;
}

export default function AnchorList(props: AnchorListProps) {

  const [activeIndex, setActiveIndex] = useState(0);

  const activateAnchor = (refIndex: number) => {
    const ref = props.anchorsRefs[refIndex];
    if (ref.current === null) {
      return;
    }
    if (props.contentRef.current === null) {
      return;
    }
    props.contentRef.current.scrollTop = (ref.current.offsetTop - props.contentRef.current.offsetTop);
    setActiveIndex(refIndex);
  };

  return (<div className={props.className + " anchor-list"}>
    {props.anchorTitles.map((title, index) => {
      return <div key={index} className={"anchor-list-item" + (index === activeIndex ? " active" : "")}
                  onClick={() => activateAnchor(index)}>
        {title}
      </div>;
    })}
  </div>);


}