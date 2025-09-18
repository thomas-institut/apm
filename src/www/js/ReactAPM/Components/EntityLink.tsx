import {Link} from "react-router";
import {useContext, useEffect, useState} from "react";
import {AppContext} from "@/ReactAPM/App";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Tid} from "@/Tid/Tid";
import Skeleton from "@/ReactAPM/Components/Skeleton";
import SmartDeferredDataComponent from "@/ReactAPM/Components/SmartDeferredDataComponent";

interface EntityLinkProps {
  id: number;
  secondaryId?: number;
  type?: 'person' | 'work' | 'singleChunkEdition' | 'multiChunkEdition' | 'collationTable' | 'document' | 'docPage'
  name?: string;
  active?: boolean;
}

/**
 *
 * Displays a link to an entity's page
 *
 */
export default function EntityLink(props: EntityLinkProps) {

  const {id, name, type, secondaryId} = props;
  const appContext = useContext(AppContext);
  const dataProxy = appContext.apiClient;

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
      break;

    case 'document':
      url = RouteUrls.document(Tid.toCanonicalString(id));
      defaultEntityName = `Doc ${id}`;
      break;

    case 'docPage':
      url = RouteUrls.docPage(Tid.toCanonicalString(id), secondaryId ?? 1);
      defaultEntityName = `DocPage ${id}:${secondaryId ?? 1}`;
  }

  const syncGetter = () => {
    if (name !== undefined) {
      return name;
    }
    return dataProxy.getEntityNameFromCache(id);
  };
  const asyncGetter = () => dataProxy.getEntityName(id);

  const childrenFromName = (name: string) => {
    if (isActive) {
      return (<Link to={url}>{name}</Link>)
    } else {
      return (<>{name}</>);
    }
  }

  return(<SmartDeferredDataComponent<string>
    asyncGetter={asyncGetter}
    syncGetter={syncGetter}
    placeholder={<Skeleton as="span" style={{width: '10em'}}>{defaultEntityName}</Skeleton>}
    onData={childrenFromName}
  />)
}