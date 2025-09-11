import {Link} from "react-router";
import {useContext, useEffect, useState} from "react";
import {Placeholder} from "react-bootstrap";
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

  switch (entityType) {
    case 'person':
      url = RouteUrls.person(Tid.toCanonicalString(id));
      break;

    case 'work':
      url = RouteUrls.work(Tid.toCanonicalString(id));
      break;

    case 'singleChunkEdition':
      url = RouteUrls.singleChunkEdition(id);
      break;

    case 'multiChunkEdition':
      url = RouteUrls.multiChunkEdition(id);
      break;

    case 'collationTable':
      url = RouteUrls.singleChunkEdition(id);

  }


  const [entityName, setEntityName] = useState(name ?? '');

  useEffect(() => {
    if (entityName === '') {
      dataProxy.getEntityName(id).then(name => {
        setEntityName(name);
      });
    }
  });

  if (entityName === '') {
    return (<Placeholder as="span" animation="glow"><Placeholder style={{width: '10em'}}/></Placeholder>);
  }
  if (isActive) {
    return (<Link to={url} discover="none">{entityName}</Link>);
  }

  return (<span>{entityName}</span>);

}