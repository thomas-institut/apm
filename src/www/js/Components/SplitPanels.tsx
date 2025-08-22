import {
  type CSSProperties, type MouseEvent, type MouseEventHandler, type ReactNode, type RefObject, useRef, useState,
} from "react";

interface Props {
  direction: "horizontal" | "vertical";
  firstPanel: ReactNode;
  secondPanel: ReactNode;
  dividerWidth?: number;
  containerClass?: string;
  firstPanelClass?: string;
  secondPanelClass?: string;
  dividerClass?: string;
  onResize?: (firstRatio: number, secondRatio: number) => void;
}

const Granularity = 1;
const DefaultDividerWidth = 5;

export default function SplitPanels(props: Props) {

  const direction = props.direction;
  const firstPanelContent = props.firstPanel;
  const secondPanelContent = props.secondPanel;
  const dividerWidth = props.dividerWidth ?? DefaultDividerWidth;
  const containerClass = props.containerClass ?? "";
  const firstPanelClass = props.firstPanelClass ?? "";
  const secondPanelClass = props.secondPanelClass ?? "";
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


  return (<>
    <div
      ref={containerRef}
      style={containerStyle}
      className={containerClass}
      onMouseUp={stopResizing}
      onMouseMove={handleMouseMove}
    >
      <div className={firstPanelClass}>{firstPanelContent}</div>
      <div
        style={dividerStyle}
        className={dividerClass}
        onMouseDown={startResizing}
        onMouseUp={stopResizing}
      ></div>
      <div className={secondPanelClass}>{secondPanelContent}</div>
    </div>
  </>);
}
