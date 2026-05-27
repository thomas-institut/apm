import {ReactNode} from "react";
import PageTopBar from "@/ui/ApeUx/TopBar/PageTopBar";

import './PageLayout.css';

interface PageLayoutProps {
  topBarCenterItems?: ReactNode;
  topBarRightItems?: ReactNode;
  children?: ReactNode;
}

export default function PageLayout({topBarCenterItems, topBarRightItems, children}: PageLayoutProps = {}) {
  return <div className="pageLayout">
    <PageTopBar centerItems={topBarCenterItems} rightItems={topBarRightItems}/>
    <div className="pageContent">
      {children}
    </div>
  </div>
}
