import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {CtVersionInfo} from "@/Api/DataSchema/ApiCollationTable";

interface AdminPanelProps extends TabbableElementProps {
  tableId: number;
  versionId: number;
  versions: CtVersionInfo[];
  isLatestVersion: boolean;
  // cloneEdition: () => Promise<number | string>;
  // archive: () => Promise<true | string>;
  // isArchived: boolean;
  // archivingEnabled: boolean;
}

export default function AdminPanel({tableId, versionId, versions, isLatestVersion}: AdminPanelProps) {

  return (<div className="admin-panel">
    <h2>Info</h2>
    <ul>
      {
        [
          ['Id', tableId],
          ['Version Id', versionId],
          ['Is Latest Version', isLatestVersion ? 'Yes' : 'No']
        ].map( ([label, value]) => <li key={label}><b>{label}:</b> {value}</li>)
      }
    </ul>
    <h2>Versions</h2>
    <ul>
      {
        versions.map( version => <li key={version.id}>{version.id}: {version.timeFrom}</li>)
      }
    </ul>
  </div>)


}