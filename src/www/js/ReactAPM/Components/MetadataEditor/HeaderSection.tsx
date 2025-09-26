import {EntityDataInterface} from "@/Api/DataSchema/ApiEntity";
import {EntityData} from "@/EntityData/EntityData";
import * as Entity from "@/constants/Entity";
import {Tid} from "@/Tid/Tid";


interface HeaderSectionProps {
  entityData: EntityDataInterface;
}


export default function HeaderSection(props: HeaderSectionProps) {

  const data = props.entityData;

  const entityName = EntityData.getAttributeValue(data, Entity.pEntityName) ?? '???';
  const entityDescription = EntityData.getAttributeValue(data, Entity.pEntityDescription) ?? '';

  return(<div className="mde-section">
    <h1 className="mde-header-name">{entityName}</h1>
    <div className="mde-header-description">{entityDescription}</div>
    <div className="mde-header-info">Entity ID: {Tid.toCanonicalString(data.id)}</div>
  </div>)

}