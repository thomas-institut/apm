import {MceDataInterface} from "@/MceData/MceDataInterface";


interface SiglaGroupsPanelProps {
  mceData: MceDataInterface
}

export default function SiglaGroupsPanel({mceData}: SiglaGroupsPanelProps) {

  if (mceData.siglaGroups.length === 0) {
    return <div>No sigla groups defined</div>
  }

  return <div>Sigla Groups Panel will be here, there are {mceData.siglaGroups.length} sigla groups defined</div>
}