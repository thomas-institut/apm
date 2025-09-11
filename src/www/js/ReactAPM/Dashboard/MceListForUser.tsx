import {AppContext} from "../App";
import {useContext} from "react";
import {useQuery} from "@tanstack/react-query";
import {Placeholder} from "react-bootstrap";
import {ApiUserMultiChunkEdition} from "@/Api/DataSchema/ApiUserMultiChunkEdition";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Link} from "react-router";
import {FilePlus} from "react-bootstrap-icons";

interface MceListForUserProps {
  userId: number;
  itemClassName?: string;
}

export default function MceListForUser(props: MceListForUserProps) {
  const {userId} = props;
  const appContext = useContext(AppContext);

  const getMceListForUser = (userId: number) => {
    return appContext.dataProxy.userMultiChunkEditions(userId);
  };

  const {isLoading, isError, data, error} = useQuery<ApiUserMultiChunkEdition[]>({
    queryKey: ['mceList', userId], queryFn: () => getMceListForUser(userId),
  });

  const newMce = (
    <div style={{marginTop: '1em'}} className={props.itemClassName}><Link to={RouteUrls.multiChunkEdition('new')}
                                                                          discover="none"><FilePlus/> Create new edition</Link>
    </div>);

  if (isLoading) {
    return (<>
      <Placeholder as="div" animation="glow">
        <Placeholder xs={12} bg="light" style={{height: '3em'}}/>
      </Placeholder>
      {newMce}
    </>);
  }

  if (isError) {
    return (<div>Error: {error.message}</div>);
  }

  if (data === undefined) {
    return (<div>Error: undefined data</div>);
  }
  const items = data.length === 0 ? <p><em>None</em></p> : data.sort((a, b) => {
    return a.title.localeCompare(b.title);
  }).map((item: any) => {
    return <p key={item.id} className={props.itemClassName}>
      <Link to={RouteUrls.multiChunkEdition(item.id)}>{item.title}</Link>
    </p>;
  });
  return <>
    {items}
    {newMce}
  </>;
}