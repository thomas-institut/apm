import {Link} from "react-router";
import {use, useContext, useEffect, useMemo, useState} from "react";
import {AppContext} from "@/ReactAPM/App";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Tid} from "@/Tid/Tid";

interface EntityLinkProps {
  id: number;
  type?: 'person' | 'work' | 'singleChunkEdition' | 'multiChunkEdition' | 'collationTable';
  name?: string;
  active?: boolean;
}

/**
 *
 * Displays a link to an entity's page
 *
 */
export default function EntityLink(props: EntityLinkProps) {

  const {id, name, type} = props;
  const appContext = useContext(AppContext);
  const dataProxy = appContext.dataProxy;

  const entityType = type ?? 'person';
  const isActive = props.active ?? true;

  let url;
  let defaultEntityName = `[${id}]`;

  switch (entityType) {
    case 'person':
      url = RouteUrls.person(Tid.toCanonicalString(id));
      defaultEntityName = `P:${Tid.toCanonicalString(id)}`;
      break;

    case 'work':
      url = RouteUrls.work(Tid.toCanonicalString(id));
      defaultEntityName = `W:${Tid.toCanonicalString(id)}`;
      break;

    case 'singleChunkEdition':
      url = RouteUrls.singleChunkEdition(id);
      defaultEntityName = `Edition ${id}`;
      break;

    case 'multiChunkEdition':
      url = RouteUrls.multiChunkEdition(id);
      defaultEntityName = `MultiChunkEdition ${id}`;
      break;

    case 'collationTable':
      url = RouteUrls.singleChunkEdition(id);
      defaultEntityName = `CollationTable ${id}`;
  }

  const initialEntityName = name ?? dataProxy.getEntityNameFromCache(id) ?? defaultEntityName;

  const [entityName, setEntityName]= useState(initialEntityName);

  useEffect(() => {
    if (name === undefined && entityName === defaultEntityName) {
      dataProxy.getEntityName(id).then(entityName => {
        setEntityName(entityName);
      });
    }
  }, [id]);


  const nameToDisplay = entityName === defaultEntityName ? (<span style={{filter: 'blur(1px'}}>{entityName}</span>) : entityName;



  if (isActive) {
    return (<Link to={url} discover="none">{nameToDisplay}</Link>);
  }

  return (<span>{nameToDisplay}</span>);

}