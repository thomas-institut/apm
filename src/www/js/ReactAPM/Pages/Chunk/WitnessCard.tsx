import {WitnessInfo} from "@/Api/DataSchema/WitnessInfo";
import {useState} from "react";
import {CaretDown, CaretRight} from "react-bootstrap-icons";


interface WitnessCardProps {
  witnessInfo: WitnessInfo;
}

export default function WitnessCard(props: WitnessCardProps) {

  let title = props.witnessInfo.systemId;
  const [collapsed, setCollapsed] = useState(true);
  if (props.witnessInfo.type === 'fullTx') {
    title = props.witnessInfo.typeSpecificInfo.docInfo.title;
  }
  return <div className="witness-card">
    <div className="witness-card-header">
      {title} <span style={{cursor: 'pointer'}} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <CaretRight/> : <CaretDown/>}</span>
    </div>
    {!collapsed && <div className="witness-card-body">---Witness will be here---</div>}
  </div>;
}