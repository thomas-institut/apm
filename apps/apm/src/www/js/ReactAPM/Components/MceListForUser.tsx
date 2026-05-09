import {ApiUserMultiChunkEdition} from "@/Api/DataSchema/ApiUserMultiChunkEdition";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {Link} from "react-router";
import {FilePlus} from "react-bootstrap-icons";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {ApmUrlGenerator} from "@/ApmUrlGenerator";
import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";

interface MceListForUserProps {
  itemClassName?: string;
  showNewMceLink?: boolean;
  data: ApiUserMultiChunkEdition[];
}

export default function MceListForUser(props: MceListForUserProps) {

  const data = props.data;
  const showMceLink = props.showNewMceLink ?? true;
  const context = useContext(AppContext);
  const urlGen = new ApmUrlGenerator(context.baseUrl);



  const newMce = (
    <div style={{marginTop: '1em'}} className={props.itemClassName}><a href={urlGen.siteMultiChunkEditionNew()} target='_blank'><FilePlus/> Create new edition</a>
    </div>);

  if (data === undefined) {
    return (<div>Error: undefined data</div>);
  }
  const items = data.length === 0 ? <p><em>None</em></p> : data.sort((a, b) => {
    return a.title.localeCompare(b.title);
  }).map((item: any) => {
    return <p key={item.id} className={props.itemClassName}>
      <EntityLink id={item.id} name={item.title} type="multiChunkEdition" active={true} openInNewTab={true}/>
    </p>;
  });
  return <>
    {items}
    {showMceLink && newMce}
  </>;
}