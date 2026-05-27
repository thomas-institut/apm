import {Children, isValidElement, ReactElement, ReactNode} from "react";
import PageTopBar from "@/ui/ApeUx/TopBar/PageTopBar";

import './PageLayout.css';

interface PageLayoutProps {
  children?: ReactNode;
}

// Marker components to identify slots in children
export const TopBarCenter = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const TopBarRight = ({ children }: { children?: ReactNode }) => <>{children}</>;

export default function PageLayout({ children }: PageLayoutProps) {
  let topBarCenterItems: ReactNode = null;
  let topBarRightItems: ReactNode = null;
  const content: ReactNode[] = [];

  // Iterate over children to identify slots
  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      // Cast the child to a ReactElement with expected props
      const element = child as ReactElement<{ children?: ReactNode }>;
      if (child.type === TopBarCenter) {
        topBarCenterItems = element.props.children;
      } else if (child.type === TopBarRight) {
        topBarRightItems = element.props.children;
      } else {
        content.push(child);
      }
    } else {
      content.push(child);
    }
  });

  return (
    <div className="pageLayout">
      <PageTopBar centerItems={topBarCenterItems} rightItems={topBarRightItems} />
      <div className="pageContent">
        {content}
      </div>
    </div>
  );
}
