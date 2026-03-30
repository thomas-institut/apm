import {flagToString, PredicateDefinitionInterface} from "@/Api/DataSchema/ApiEntity";
import {Fragment, useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import {tAttribute} from "@/constants/Entity";
import EntityLink from "@/ReactAPM/Components/EntityLink";


interface PredicateDataProps {
  id: number,
  def: PredicateDefinitionInterface
}

export function PredicateData(props: PredicateDataProps) {

  const {id, def} = props;

  const context = useContext(AppContext);

  const getPredicateData = async () => {
    if (def !== undefined) {
      return def;
    }
    return context.apiClient.getPredicateDefinition(id);
  };

  const query = useQuery<PredicateDefinitionInterface>({
    queryFn: getPredicateData, queryKey: ['PredicateDefinition', id]
  });

  if (query.status === 'pending') {
    return <div>Loading predicate data...</div>;
  }

  if (query.status === 'error') {
    return <div>Error loading predicate data: {query.error.message}</div>;
  }

  const predicateDef = query.data;
  const isAttribute = predicateDef.type === tAttribute;

  function getEntityList(entityIds: number[], separator: string = ', ') {
    return entityIds.map((id, index) => (
      <Fragment key={id}>{index === 0 ? '' : separator}<EntityLink id={id} type={"admin"}/></Fragment>));
  }

  return <div className={'predicate-data'}>
    {predicateDef.deprecated && <div><b>Deprecated</b>: {predicateDef.deprecationNotice}</div>}
    <div><b>Description</b>: {predicateDef.description}</div>
    <div><b>Single Property:</b> {predicateDef.singleProperty ? 'Yes' : 'No'}</div>
    {isAttribute && predicateDef.allowedValues !== null &&
      <div><b>Allowed Object Literal Values:</b> {predicateDef.allowedValues.join(', ')}</div>}
    {predicateDef.flags !== null && predicateDef.flags.length > 0 &&
      <div><b>Flags:</b> {predicateDef.flags.map(f => flagToString(f)).join(', ')}</div>}
    {!isAttribute && predicateDef.allowedObjectTypes !== null && (<div>
        <b>Allowed Object Types</b>: {getEntityList(predicateDef.allowedObjectTypes)}
      </div>)}
    {!isAttribute && <div><b>Is Primary Relation:</b> {predicateDef.isPrimaryRelation ? 'Yes' : 'No'}</div>}
    {!isAttribute && predicateDef.reversePredicate !== null &&
      <div><b>Reverse Predicate</b>: <EntityLink id={predicateDef.reversePredicate} type={'admin'}/></div>}
    {predicateDef.allowedQualifications !== null && predicateDef.allowedQualifications.length > 0 && (<div>
        <b>Allowed Qualifications</b>: {getEntityList(predicateDef.allowedQualifications)}
      </div>)}
    <div><b>Can be Cancelled</b>: {predicateDef.canBeCancelled ? 'Yes' : 'No'}</div>

  </div>;

}