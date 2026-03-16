import {EntityNameTuple} from "@/Api/ApmApiClient";
import {CSSProperties, RefObject} from "react";


interface EntitySelectProps {
  entityTuples: EntityNameTuple[];
  selectedEntity?: number;
  maxNameWidth?: number;
  className?: string;
  style?: CSSProperties;
  onChange?: (entityId: number) => void;
  ref?: RefObject<HTMLSelectElement|null>;
}


export default function EntitySelect(props: EntitySelectProps) {

  const entityTuples = props.entityTuples;
  const maxNameWidth = props.maxNameWidth ?? -1;
  if (entityTuples.length === 0) {
    return (<></>);
  }

  const defaultValue = props.selectedEntity ?? entityTuples[0][0];


  return (<select ref={props.ref} defaultValue={defaultValue} className={props.className} style={props.style} onChange={(e) => props.onChange?.(parseInt(e.target.value))}>
    {entityTuples.map((tuple, index) => (<option key={index} value={tuple[0]}>
      {maxNameWidth === -1 ? tuple[1] : tuple[1].substring(0,maxNameWidth)}
    </option>))}
  </select>)



}