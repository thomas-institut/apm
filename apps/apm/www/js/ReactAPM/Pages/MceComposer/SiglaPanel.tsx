import {MceDataInterface} from "@/MceData/MceDataInterface";


interface SiglaPanelProps {
  mceData: MceDataInterface
}

export default function SiglaPanel({mceData}: SiglaPanelProps) {

  return <div className={'sigla-panel'}>
    { mceData.sigla.length === 0 && <>No sigla defined</>}
    { mceData.sigla.length > 0 && <>Sigla Panel will be here, this is the current sigla: { mceData.sigla.join(', ')}</>}
  </div>
}