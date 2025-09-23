import {ApiUserMultiChunkEdition} from "@/Api/DataSchema/ApiUserMultiChunkEdition";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Link} from "react-router";
import {FilePlus} from "react-bootstrap-icons";

interface MceListForUserProps {
  itemClassName?: string;
  showNewMceLink?: boolean;
  data: ApiUserMultiChunkEdition[];
}

export default function MceListForUser(props: MceListForUserProps) {

  const data = props.data;
  const showMceLink = props.showNewMceLink ?? true;



  const newMce = (
    <div style={{marginTop: '1em'}} className={props.itemClassName}><Link to={RouteUrls.multiChunkEdition('new')}
                                                                          discover="none"><FilePlus/> Create new edition</Link>
    </div>);

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
    {showMceLink && newMce}
  </>;
}