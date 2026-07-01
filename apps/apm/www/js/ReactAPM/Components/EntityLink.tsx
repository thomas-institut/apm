import {Link} from "react-router";
import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Tid} from "@/Tid/Tid";
import Skeleton from "@/ReactAPM/Components/Skeleton";
import SmartDeferredDataComponent from "@/ReactAPM/Components/SmartDeferredDataComponent";
import {ApmUrlGenerator} from "@/ApmUrlGenerator";
import {MaxSystemEntityId} from "@/constants/Entity";
import {BoxArrowUpRight} from "react-bootstrap-icons";

interface EntityLinkProps {
  id: number;
  secondaryId?: number;
  type?: 'person' | 'work' | 'singleChunkEdition' | 'multiChunkEdition' | 'collationTable' | 'document' | 'docPage' | 'admin';
  name?: string;
  label?: string | null;
  title?: string;
  useUrlAsLabel?: boolean;
  active?: boolean;
  openInNewTab?: boolean;
  showIconWithLabel?: boolean;
}

interface LinkDef {
  label: string;
  title: string | null;
  isReactRoute: boolean;
  openInNewTab?: boolean;
  showIconWithLabel?: boolean;
}

/**
 *
 * Displays a link to an entity's page
 *
 */
export default function EntityLink(props: EntityLinkProps) {

  const {id, name, label, useUrlAsLabel, type, title,  secondaryId, openInNewTab, showIconWithLabel = false} = props;
  const appContext = useContext(AppContext);
  const apiClient = appContext.apiClient;

  const entityType = type ?? 'person';
  const isActive = props.active ?? true;
  const urlGen = new ApmUrlGenerator(appContext.baseUrl);
  let isReactRoute = true;

  let url: string;
  let realTitle: string;
  let defaultEntityName = `[${id}]`;

  switch (entityType) {

    case 'admin':
      url = RouteUrls.adminEntity(id);
      isReactRoute = true;
      defaultEntityName = `${id < MaxSystemEntityId ? id : Tid.toCanonicalString(id)}`;
      realTitle = title ?? `Entity ${id}`;
      break;

    case 'person':
      // url = RouteUrls.person(Tid.toCanonicalString(id));
      url = urlGen.sitePerson(Tid.toCanonicalString(id));
      isReactRoute = false;
      defaultEntityName = `P:${Tid.toCanonicalString(id)}`;
      realTitle = title ?? `Person ${Tid.toCanonicalString(id)}`;
      break;

    case 'work':
      // url = RouteUrls.work(Tid.toCanonicalString(id));
      url = urlGen.siteWorkPage(Tid.toCanonicalString(id));
      isReactRoute = true;
      defaultEntityName = `W:${Tid.toCanonicalString(id)}`;
      realTitle = title ?? `Work ${Tid.toCanonicalString(id)}`;
      break;

    case 'singleChunkEdition':
      // url = RouteUrls.singleChunkEdition(id);
      url = urlGen.siteChunkEdition(id);
      isReactRoute = false;
      realTitle = title  ?? `ChunkEdition ${id}`;
      defaultEntityName = `Edition ${id}`;
      break;

    case 'multiChunkEdition':
      // url = RouteUrls.multiChunkEdition(id);
      url = urlGen.siteMultiChunkEdition(id);
      isReactRoute = false;
      defaultEntityName = `MultiChunkEdition ${id}`;
      realTitle = title ?? `MultiChunkEdition ${id}`;
      break;

    case 'collationTable':
      // url = RouteUrls.singleChunkEdition(id);
      url = urlGen.siteChunkEdition(id);
      isReactRoute = false;
      realTitle = title ?? `CollationTable ${id}`;
      defaultEntityName = `CollationTable ${id}`;
      break;

    case 'document':
      // url = RouteUrls.document(Tid.toCanonicalString(id));
      url = urlGen.siteDocPage(Tid.toCanonicalString(id));
      isReactRoute = false;
      realTitle = title ?? `Document ${Tid.toCanonicalString(id)}`;
      defaultEntityName = `Doc ${Tid.toCanonicalString(id)}`;
      break;

    case 'docPage':
      //url = RouteUrls.docPage(Tid.toCanonicalString(id), secondaryId ?? 1);
      url = urlGen.siteDocPage(id, secondaryId ?? null);
      isReactRoute = false;
      realTitle = title ?? `DocPage ${Tid.toCanonicalString(id)}:${secondaryId ?? 1}`;
      defaultEntityName = `DocPage ${Tid.toCanonicalString(id)}:${secondaryId ?? 1}`;
  }

  if (openInNewTab && title === undefined) {
    realTitle = `${realTitle} (open in new tab)`;
  }

  const syncGetter: () => LinkDef | null = () => {
    if (useUrlAsLabel === true) {
      return {label: url, title: realTitle, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false, showIconWithLabel: showIconWithLabel};
    }
    if (label !== undefined && label !== null) {
      return {label: label, title: realTitle, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false, showIconWithLabel: showIconWithLabel};
    }
    if (name !== undefined) {
      return {label: name, title: realTitle, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false, showIconWithLabel: showIconWithLabel};
    }
    const cachedName = apiClient.getEntityNameFromCache(id);

    if (cachedName === null) {
      return null;
    }
    return {label: cachedName, title: realTitle, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false, showIconWithLabel: showIconWithLabel};
  };


  const asyncGetter: () => Promise<LinkDef> = async () => {
    const name = await apiClient.getEntityName(id);
    return {label: name, title: realTitle, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false};
  };

  const linkFromDef = (def: LinkDef) => {
    let label = <>{def.label}</>;
    if (def.openInNewTab && def.showIconWithLabel) {
      label = <>{label} <small><BoxArrowUpRight/></small></>;
    }
    if (isActive) {
      if (def.isReactRoute) {
        return (<Link to={url} title={def.title ?? ''}>{label}</Link>);
      }
      return def.openInNewTab ? <a href={url} target={'_blank'} title={def.title ?? ''}>{label}</a> :
        <a href={url}>{label}</a>;
    } else {
      return (<>{label}</>);
    }
  };

  const watchValue = `${entityType}:${id}:${secondaryId ?? ''}:${label ?? ''}:${name ?? ''}:${useUrlAsLabel === true ? 'url' : 'name'}`;

  return (<SmartDeferredDataComponent<LinkDef>
    asyncGetter={asyncGetter}
    syncGetter={syncGetter}
    watchValue={watchValue}
    placeholder={<Skeleton as="span" style={{width: '10em'}}>{defaultEntityName}</Skeleton>}
    onData={linkFromDef}
  />);
}