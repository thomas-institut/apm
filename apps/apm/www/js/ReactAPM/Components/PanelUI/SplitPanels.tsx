import {
  Children,
  // cloneElement,
  type CSSProperties,
  isValidElement, type MouseEvent,
  type MouseEventHandler,
  ReactElement,
  type RefObject,
  useRef,
  useState,
} from "react";

type StylableChild = ReactElement<{style?: CSSProperties, className?: string}>

interface SplitPanelsProps {
  direction: "horizontal" | "vertical";
  children?: StylableChild | StylableChild[];
  dividerWidth?: number;
  outerMargin?: number;
  className?: string;
  dividerClass?: string;
  onResize?: (firstRatio: number, secondRatio: number) => void;
}

const Granularity = 1;
const DefaultDividerWidth = 5;

/**
 * A SplitPanels component is a container that splits its children into two resizable panels.
 *
 * It **MUST** contain exactly two children.
 *
 * Any element can be a child and will work as intended as long as it has its height set to 100%, and it is not allowed
 * to grow beyond its parent's height. For a simple div, this can be achieved with the following CSS styles:
 *
 * ```css
 *     overflow: auto;
 *     height: 100%;
 *     min-height: 0;
 *     box-sizing: border-box;
 * ```
 *
 * More complex arrangements require using ``min-height`` and ``overflow`` properties in the right places.
 * The components `PanelContent`, `Panel` and `TabPanel` comply with these styles and work out of the box.
 *
 * @param props
 * @constructor
 */
export default function SplitPanels(props: SplitPanelsProps) {

  const direction = props.direction;
  const dividerWidth = props.dividerWidth ?? DefaultDividerWidth;
  const outerMargin = props.outerMargin ?? dividerWidth;


  const children = Children.toArray(props.children);

  if (children.length !== 2) {
    throw new Error("SplitPanels must have exactly two children");
  }

  children.forEach((child) => {
    if (!isValidElement(child)) {
      throw new Error('SplitPanels children must be valid React elements');
    }
  });

  const childOne = children[0];
  const childTwo = children[1];

  const containerClass = props.className ?? '';
  const dividerClass = props.dividerClass ?? '';


  const [isResizing, setResizing] = useState(false);
  const [gridTemplate, setGridTemplate] = useState(`0.5fr ${dividerWidth}px 0.5fr`);

  const lastXY = useRef(-1);
  const firstRatio = useRef(0.5);
  const containerRef: RefObject<HTMLDivElement | null> = useRef(null);

  const containerStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: direction === 'vertical' ? gridTemplate : '',
    gridTemplateRows: direction === 'horizontal' ? gridTemplate : '',
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
  return <div ref={containerRef} style={containerStyle} className={containerClass}
              onMouseUp={stopResizing} onMouseMove={handleMouseMove}>
    {childOne}
    <div style={dividerStyle} className={dividerClass} onMouseDown={startResizing} onMouseUp={stopResizing}></div>
    {childTwo}
  </div>;
}

// function childWithStyle(child: ReactNode, extraStyle: CSSProperties) {
//   if (!isValidElement(child)) {
//     return child;
//   }
//
//   return cloneElement(child, {
//     // @ts-ignore
//     style: {
//       // @ts-ignore
//       ...(child.props.style ?? {}),
//       ...extraStyle,
//     },
//   });
// }