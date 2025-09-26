import {Link, useParams} from "react-router";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {useContext} from "react";
import {AppContext} from "@/ReactAPM/App";
import {useQuery} from "@tanstack/react-query";
import NotFound from "@/ReactAPM/Pages/NotFound";
import {Tid} from "@/Tid/Tid";
import {Breadcrumb} from "react-bootstrap";
import {RouteUrls} from "@/ReactAPM/Router/RouteUrls";
import {EntityData} from "@/EntityData/EntityData";
import * as Entity from "@/constants/Entity";
import {MetadataEditorSchema} from "@/MetadataEditor/MetadataEditorSchemata/MetadataEditorSchema";
import MetadataEditor from "@/ReactAPM/Components/MetadataEditor/MetadataEditor";


export default function Person() {
  const appContext = useContext(AppContext);
  document.title = 'Person (beta)';

  const {id} = useParams();

  if (id === undefined) {
    return <NotFound/>;
  }

  const entityId = Tid.fromCanonicalString(id);
  const canonicalId = Tid.toCanonicalString(entityId);

  const personSchema = MetadataEditorSchema.getSchema(Entity.tPerson);

  if (personSchema === null) {
    return <NormalPageContainer>Error: Cannot find metadata schema to Person type</NormalPageContainer>
  }

  if (entityId < 0) {
    return <NotFound/>;
  }


  const getPersonEntityData = () => {
    return appContext.apiClient.getEntityData(entityId);
  }

  const queryResult = useQuery({
    queryKey: ['person', entityId], queryFn: getPersonEntityData,
  })

  switch (queryResult.status) {
    case 'pending':
      return <NormalPageContainer>Loading...</NormalPageContainer>

    case 'error':
      return <NormalPageContainer>Error: {queryResult.error.message}</NormalPageContainer>
  }

  console.log(queryResult.data);

  const name = EntityData.getAttributeValue(queryResult.data, Entity.pEntityName) ?? 'Unknown';
  const isUser = EntityData.getBooleanAttributeValue(queryResult.data, Entity.pIsUser) ?? false;
  document.title = `${name} (beta)`;

  return (
    <NormalPageContainer>
      <Breadcrumb>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: RouteUrls.people()}}>People</Breadcrumb.Item>
        <Breadcrumb.Item active>Person Details</Breadcrumb.Item>
      </Breadcrumb>
      <MetadataEditor schema={personSchema} entityData={queryResult.data} apiClient={appContext.apiClient}/>
      <div>Is User: {isUser ? 'Yes' : 'No'}</div>
    </NormalPageContainer>

  )
}