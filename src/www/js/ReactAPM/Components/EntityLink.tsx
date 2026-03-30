import {Link} from "react-router";
import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Tid} from "@/Tid/Tid";
import Skeleton from "@/ReactAPM/Components/Skeleton";
import SmartDeferredDataComponent from "@/ReactAPM/Components/SmartDeferredDataComponent";
import {ApmUrlGenerator} from "@/ApmUrlGenerator";
import {MaxSystemEntityId} from "@/constants/Entity";

interface EntityLinkProps {
  id: number;
  secondaryId?: number;
  type?: 'person' | 'work' | 'singleChunkEdition' | 'multiChunkEdition' | 'collationTable' | 'document' | 'docPage' | 'admin';
  name?: string;
  label?: string | null ;
  useUrlAsLabel?: boolean;
  active?: boolean;
  openInNewTab?: boolean;
}

interface LinkDef {
  label: string;
  title: string | null;
  isReactRoute: boolean;
  openInNewTab?: boolean;
}

/**
 *
 * Displays a link to an entity's page
 *
 */
export default function EntityLink(props: EntityLinkProps) {

  const {id, name, label, useUrlAsLabel, type, secondaryId, openInNewTab} = props;
  const appContext = useContext(AppContext);
  const apiClient = appContext.apiClient;

  const entityType = type ?? 'person';
  const isActive = props.active ?? true;
  const urlGen = new ApmUrlGenerator(appContext.baseUrl);
  let isReactRoute = true;

  let url: string;
  let title: string;
  let defaultEntityName = `[${id}]`;

  switch (entityType) {

    case 'admin':
      url = RouteUrls.adminEntity(id);
      isReactRoute = true;
      defaultEntityName = `${id < MaxSystemEntityId ? id : Tid.toCanonicalString(id)}`;
      title = `Entity ${id}`
      break;

    case 'person':
      // url = RouteUrls.person(Tid.toCanonicalString(id));
      url = urlGen.sitePerson(Tid.toCanonicalString(id));
      isReactRoute = false;
      defaultEntityName = `P:${Tid.toCanonicalString(id)}`;
      title = `Person ${Tid.toCanonicalString(id)}`
      break;

    case 'work':
      // url = RouteUrls.work(Tid.toCanonicalString(id));
      url = urlGen.siteWorkPage(Tid.toCanonicalString(id));
      isReactRoute = true;
      defaultEntityName = `W:${Tid.toCanonicalString(id)}`;
      title = `Work ${Tid.toCanonicalString(id)}`
      break;

    case 'singleChunkEdition':
      // url = RouteUrls.singleChunkEdition(id);
      url = urlGen.siteChunkEdition(id);
      isReactRoute = false;
      title = `ChunkEdition ${id}`
      defaultEntityName = `Edition ${id}`;
      break;

    case 'multiChunkEdition':
      // url = RouteUrls.multiChunkEdition(id);
      url = urlGen.siteMultiChunkEdition(id);
      isReactRoute = false;
      defaultEntityName = `MultiChunkEdition ${id}`;
      title = `MultiChunkEdition ${id}`
      break;

    case 'collationTable':
      // url = RouteUrls.singleChunkEdition(id);
      url = urlGen.siteChunkEdition(id);
      isReactRoute = false;
      title = `CollationTable ${id}`
      defaultEntityName = `CollationTable ${id}`;
      break;

    case 'document':
      // url = RouteUrls.document(Tid.toCanonicalString(id));
      url = urlGen.siteDocPage(Tid.toCanonicalString(id));
      isReactRoute = false;
      title = `Document ${Tid.toCanonicalString(id)}`
      defaultEntityName = `Doc ${Tid.toCanonicalString(id)}`;
      break;

    case 'docPage':
      //url = RouteUrls.docPage(Tid.toCanonicalString(id), secondaryId ?? 1);
      url = urlGen.siteDocPage(id, secondaryId ?? null);
      isReactRoute = false;
      title = `DocPage ${Tid.toCanonicalString(id)}:${secondaryId ?? 1}`
      defaultEntityName = `DocPage ${Tid.toCanonicalString(id)}:${secondaryId ?? 1}`;
  }

  const syncGetter: () => LinkDef | null = ()  => {
    if (useUrlAsLabel === true) {
      return {label: url, title: title, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false};
    }
    if (label !== undefined && label !== null) {
      return {label: label, title: title, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false}
    }
    if (name !== undefined) {
      return {label: name, title: title, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false};
    }
    const cachedName = apiClient.getEntityNameFromCache(id);

    if (cachedName === null) {
      return null;
    }
    return {label: cachedName, title: title, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false};
  };

  const asyncGetter: () => Promise<LinkDef> = async () => {
    const name = await apiClient.getEntityName(id);
    return {label: name, title: title, isReactRoute: isReactRoute, openInNewTab: openInNewTab ?? false};
  };

  const linkFromDef = (def: LinkDef) => {
    let label = def.label;
    if (isActive) {
      if (def.isReactRoute) {
        return (<Link to={url} title={def.title ?? ''}>{label}</Link>);
      }
      return def.openInNewTab ? <a href={url} target={'_blank'} title={def.title ?? ''}>{label}</a> : <a href={url}>{label}</a>;
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