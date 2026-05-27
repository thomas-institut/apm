import {ReactNode} from "react";

interface CenterAreaProps {
  children?: ReactNode;
}

export default function CenterArea({children}: CenterAreaProps = {}) {
  return <div className="centerArea">
    {children}
  </div>
}
