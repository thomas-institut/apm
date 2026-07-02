import {MceDataInterface} from "@/MceData/MceDataInterface";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";


interface SiglaGroupsPanelProps extends TabbableElementProps {
  mceData: MceDataInterface
}

export default function SiglaGroupsPanel({mceData}: SiglaGroupsPanelProps) {


  return <div className="sigla-groups-panel">
    { mceData.siglaGroups.length === 0 && <>No sigla groups defined</>}
    { mceData.siglaGroups.length > 0 && <>Sigla Groups Panel will be here, there are {mceData.siglaGroups.length} sigla groups defined</>}
  </div>

}