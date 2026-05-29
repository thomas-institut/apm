import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {Tid} from "@/Tid/Tid";
import {MaxSystemEntityId} from "@/constants/Entity";


interface TypeDataProps {
  type: number;
}

export function TypeData(props: TypeDataProps) {

  const {type} = props;
  const context = useContext(AppContext);

  const allEntitiesQuery = useQuery({
    queryKey: ['allEntitiesForType', type], queryFn: () => context.apiClient.getEntityListForType(type),
  });

  if (allEntitiesQuery.status === 'pending') {
    return <div>Loading entity data...</div>;
  }

  if (allEntitiesQuery.status === 'error') {
    return <div>Error loading entity data: {allEntitiesQuery.error.message}</div>;
  }

  const allEntities = allEntitiesQuery.data;

  return (<div className={'type-data'}>
    <h3>Entities of type {type}</h3>
    {allEntities.length === 0 ? <div><em>No entities of this type</em></div> : null}
    <div className={'type-entity-list'}>
      {allEntities.map((id) =>
        <div key={id}>
          { allEntities.length <= 100 && <EntityLink id={id} type={'admin'}/>}
          { allEntities.length > 100 && <EntityLink id={id} type={'admin'} label={id < MaxSystemEntityId ? id.toString() : Tid.toCanonicalString(id)}/>}
         </div>
      )}
    </div>
  </div>);


}