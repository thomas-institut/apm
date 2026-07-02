import {MceDataInterface} from "@/MceData/MceDataInterface";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";


interface SiglaPanelProps extends TabbableElementProps {
  mceData: MceDataInterface
}

export default function SiglaPanel({mceData}: SiglaPanelProps) {
  return <div className={'sigla-panel'}>
    { mceData.sigla.length === 0 && <>No sigla defined</>}
    { mceData.sigla.length > 0 && <>Sigla Panel will be here, this is the current sigla: { mceData.sigla.join(', ')}</>}
  </div>
}