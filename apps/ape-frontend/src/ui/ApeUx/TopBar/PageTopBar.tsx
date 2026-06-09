import LeftArea from "@/ui/ApeUx/TopBar/LeftArea";
import CenterArea from "@/ui/ApeUx/TopBar/CenterArea";
import RightArea from "@/ui/ApeUx/TopBar/RightArea";

import {ReactNode} from "react";

interface PageTopBarProps {
  centerItems?: ReactNode;
  rightItems?: ReactNode;
}

export default function PageTopBar({centerItems, rightItems}: PageTopBarProps = {}) {

  return <div className="pageTopBar">
    <LeftArea/>
    <CenterArea>{centerItems}</CenterArea>
    <RightArea>{rightItems}</RightArea>
  </div>

}
