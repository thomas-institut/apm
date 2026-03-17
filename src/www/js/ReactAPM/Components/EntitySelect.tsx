import {EntityNameTuple} from "@/Api/ApmApiClient";
import {CSSProperties} from "react";


interface EntitySelectProps {
  entityTuples: EntityNameTuple[];
  selectedEntity: number;
  maxNameWidth?: number;
  className?: string;
  style?: CSSProperties;
  onChange?: (entityId: number) => void;
}


export default function EntitySelect(props: EntitySelectProps) {

  const entityTuples = props.entityTuples;
  const maxNameWidth = props.maxNameWidth ?? -1;
  if (entityTuples.length === 0) {
    return null;
  }

  return (<select value={String(props.selectedEntity)} className={props.className} style={props.style}
                  onChange={(e) => props.onChange?.(parseInt(e.target.value, 10))}>
    {entityTuples.map((tuple) => (<option key={String(tuple[0])} value={String(tuple[0])}>
      {maxNameWidth === -1 ? tuple[1] : tuple[1].substring(0, maxNameWidth)}
    </option>))}
  </select>);

}