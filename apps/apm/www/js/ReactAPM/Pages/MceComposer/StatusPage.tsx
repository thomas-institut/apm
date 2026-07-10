import {ReactNode} from "react";
import ApmLogo from "@/ReactAPM/Components/ApmLogo/ApmLogo";
import './StatusPage.css';

interface StatusPageProps {
  label: string;
  children: ReactNode;
}

/**
 * Page to show information about the status of the MCE composer.
 *
 * @constructor
 */
export function StatusPage({children, label}: StatusPageProps) {

  return <div className={'status-page'}>
    <div className={'status-page-header'}>
      <ApmLogo className={'apm-logo'} height={30}/>
      <div className={'status-page-label'}>{label}</div>
    </div>
    <div className={'status-page-content'}>
      {children}
    </div>
  </div>;
}