import {PredicateDefinitionInterface} from "@/Api/DataSchema/ApiEntity";
import * as Entity from "@/constants/Entity";


export function isRelation(def: PredicateDefinitionInterface) : boolean {
  return def.type === Entity.tRelation;
}

export function hasFlag(def: PredicateDefinitionInterface, flagId: number) : boolean {
  return def.flags?.includes(flagId) || false;
}
