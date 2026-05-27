import {ReactNode} from "react";

interface RightAreaProps {
  children?: ReactNode;
}

export default function RightArea({children}: RightAreaProps = {}) {
  return <div className="rightArea">
    {children}
  </div>
}
