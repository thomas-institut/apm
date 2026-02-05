import {Link} from "react-router";
import {useContext, useEffect, useState} from "react";
import {AppContext} from "@/ReactAPM/App";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Tid} from "@/Tid/Tid";
import Skeleton from "@/ReactAPM/Components/Skeleton";
import SmartDeferredDataComponent from "@/ReactAPM/Components/SmartDeferredDataComponent";
import {ApmUrlGenerator} from "@/ApmUrlGenerator";

interface EntityLinkProps {
  id: number;
  secondaryId?: number;
  type?: 'person' | 'work' | 'singleChunkEdition' | 'multiChunkEdition' | 'collationTable' | 'document' | 'docPage'
  name?: string;
  active?: boolean;
  openInNewTab?: boolean;
}

interface LinkDef {
  name: string|null;
  isReactRoute: boolean;
  openInNewTab?: boolean;
}
/**
 *
 * Displays a link to an entity's page
 *
 */
export default function EntityLink(props: EntityLinkProps) {

  const {id, name, type, secondaryId, openInNewTab} = props;
  const appContext = useContext(AppContext);
  const dataProxy = appContext.apiClient;

  const entityType = type ?? 'person';
  const isActive = props.active ?? true;
  const urlGen = new ApmUrlGenerator(appContext.baseUrl);
  let isReactRoute = true;

  let url;
  let defaultEntityName = `[${id}]`;

  switch (entityType) {
    case 'person':
      // url = RouteUrls.person(Tid.toCanonicalString(id));
      url = urlGen.sitePerson(Tid.toCanonicalString(id));
      isReactRoute = false;
      defaultEntityName = `P:${Tid.toCanonicalString(id)}`;
      break;

    case 'work':
      // url = RouteUrls.work(Tid.toCanonicalString(id));
      url = urlGen.siteWorkPage(Tid.toCanonicalString(id));
      isReactRoute = true;
      defaultEntityName = `W:${Tid.toCanonicalString(id)}`;
      break;

    case 'singleChunkEdition':
      // url = RouteUrls.singleChunkEdition(id);
      url = urlGen.siteChunkEdition(id);
      isReactRoute = false;
      defaultEntityName = `Edition ${id}`;
      break;

    case 'multiChunkEdition':
      // url = RouteUrls.multiChunkEdition(id);
      url = urlGen.siteMultiChunkEdition(id);
      isReactRoute = false;
      defaultEntityName = `MultiChunkEdition ${id}`;
      break;

    case 'collationTable':
      // url = RouteUrls.singleChunkEdition(id);
      url = urlGen.siteChunkEdition(id);
      isReactRoute = false;
      defaultEntityName = `CollationTable ${id}`;
      break;

    case 'document':
      // url = RouteUrls.document(Tid.toCanonicalString(id));
      url = urlGen.siteDocPage(Tid.toCanonicalString(id));
      isReactRoute = false;
      defaultEntityName = `Doc ${id}`;
      break;

    case 'docPage':
      //url = RouteUrls.docPage(Tid.toCanonicalString(id), secondaryId ?? 1);
      url = urlGen.siteDocPage(id);
      if (secondaryId !== undefined) {
        url += `/${secondaryId}`;
      }
      isReactRoute = false;
      defaultEntityName = `DocPage ${id}:${secondaryId ?? 1}`;
  }

  const syncGetter: () => LinkDef|null = () => {
    if (name !== undefined) {
      return  {name:name, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false};
    }
    const cachedName = dataProxy.getEntityNameFromCache(id);
    if (cachedName === null) {
      return null;
    }
    return {name: cachedName, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false}
  };
  const asyncGetter: ()=>Promise<LinkDef> = async () => {
    const name = await dataProxy.getEntityName(id);
    return {name: name, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false};
  };

  const linkFromDef = (def: LinkDef) => {
    const name = def.name ?? defaultEntityName;
    if (isActive) {
      if (def.isReactRoute) {
        return (<Link to={url}>{name}</Link>)
      }
      return def.openInNewTab ? <a href={url} target={'_blank'}>{name}</a> :  <a href={url}>{name}</a>
    } else {
      return (<>{name}</>);
    }
  }

  return(<SmartDeferredDataComponent<LinkDef>
    asyncGetter={asyncGetter}
    syncGetter={syncGetter}
    placeholder={<Skeleton as="span" style={{width: '10em'}}>{defaultEntityName}</Skeleton>}
    onData={linkFromDef}
  />)
}