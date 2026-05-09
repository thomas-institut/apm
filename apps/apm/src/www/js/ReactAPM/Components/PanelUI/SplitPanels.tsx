import {
  Children,
  cloneElement,
  type CSSProperties,
  isValidElement,
  type MouseEvent,
  type MouseEventHandler,
  ReactElement,
  type ReactNode,
  type RefObject,
  useRef,
  useState,
} from "react";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import TabPanel from "@/ReactAPM/Components/PanelUI/TabPanel";


type SplitPanelsChild = ReactElement<{}, typeof Panel> | ReactElement<{}, typeof TabPanel>;

const ValidTypes = [Panel, TabPanel];

interface Props {
  direction: "horizontal" | "vertical";
  children?: ReactNode;
  dividerWidth?: number;
  outerMargin?: number;
  className?: string;
  dividerClass?: string;
  onResize?: (firstRatio: number, secondRatio: number) => void;
}

const Granularity = 1;
const DefaultDividerWidth = 5;

export default function SplitPanels(props: Props) {

  const direction = props.direction;
  const dividerWidth = props.dividerWidth ?? DefaultDividerWidth;
  const outerMargin = props.outerMargin ?? dividerWidth;


  const children = Children.toArray(props.children) as SplitPanelsChild[];

  if (children.length !== 2) {
    throw new Error("SplitPanels must have exactly two children");
  }

  children.forEach((child) => {
    if (!isValidElement(child)) {
      throw new Error('SplitPanels children must be valid React elements');
    }
    if (!ValidTypes.includes(child.type)) {
      throw new Error(`SplitPanels children must be Panel or TabPanel components`);
    }
  });

  const firstPanel = children[0];
  const secondPanel = children[1];

  const containerClass = props.className ?? "";
  const dividerClass = props.dividerClass ?? "";


  const [isResizing, setResizing] = useState(false);
  const [gridTemplate, setGridTemplate] = useState(`0.5fr ${dividerWidth}px 0.5fr`);

  // console.log(`Split panels with direction '${direction}', grid template is '${gridTemplate}'`);

  const lastXY = useRef(-1);
  const firstRatio = useRef(0.5);
  const containerRef: RefObject<HTMLDivElement | null> = useRef(null);

  const containerStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: direction === 'vertical' ? gridTemplate : '',
    gridTemplateRows: direction === 'horizontal' ? gridTemplate : '',
    // height:  `calc(100% - ${outerMargin * 2}px)`,
    height: "100%",
    boxSizing: "border-box",
    padding: outerMargin,
    overflow: "hidden",
  };

  const dividerStyle: CSSProperties = {
    width: "100%", cursor: direction === "vertical" ? "col-resize" : "row-resize",
  };

  const startResizing: MouseEventHandler = (ev: MouseEvent) => {
    ev.preventDefault();
    // console.log("startResizing");
    setResizing(true);
  };

  const stopResizing: MouseEventHandler = (ev: MouseEvent) => {
    if (isResizing) {
      // console.log("stopResizing");
      ev.preventDefault();
      setResizing(false);
      if (props.onResize !== undefined) {
        props.onResize(firstRatio.current, 1 - firstRatio.current);
      }
    }
  };

  const handleMouseMove: MouseEventHandler = (e: MouseEvent) => {
    if (isResizing) {
      if (containerRef.current === null) {
        console.log("containerRef.current is null");
        return;
      }
      const newXY = direction === "vertical" ? e.clientX : e.clientY;
      if (Math.abs(newXY - lastXY.current) < Granularity) {
        return;
      }
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerLength = direction === "vertical" ? containerRect.width : containerRect.height;
      const containerStart = direction === "vertical" ? containerRect.left : containerRect.top;
      firstRatio.current = (newXY - containerStart) / containerLength;
      const secondRatio = 1 - firstRatio.current;
      setGridTemplate(`${firstRatio.current}fr ${dividerWidth}px ${secondRatio}fr`);
      lastXY.current = newXY;
    }
  };
  const firstPanelStyle = {};
  const secondPanelStyle = {};
  return <div ref={containerRef} style={containerStyle} className={containerClass}
              onMouseUp={stopResizing} onMouseMove={handleMouseMove}>
    {addStyleToChild(firstPanel, firstPanelStyle)}
    <div style={dividerStyle} className={dividerClass} onMouseDown={startResizing} onMouseUp={stopResizing}></div>
    {addStyleToChild(secondPanel, secondPanelStyle)}
  </div>;
}


function addStyleToChild(child: ReactNode, extraStyle: CSSProperties) {
  if (!isValidElement(child)) {
    return child;
  }

  return cloneElement(child, {
    // @ts-ignore
    style: {
      // @ts-ignore
      ...(child.props.style ?? {}),
      ...extraStyle,
    },
  });
}