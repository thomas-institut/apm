import {MceDataInterface} from "@/MceData/MceDataInterface";


interface SiglaPanelProps {
  mceData: MceDataInterface
}

export default function SiglaPanel({mceData}: SiglaPanelProps) {

  if (mceData.sigla.length === 0) {
    return <div>No sigla defined</div>
  }

  return <div>Sigla Panel will be here, this is the current sigla: { mceData.sigla.join(', ')}</div>
}