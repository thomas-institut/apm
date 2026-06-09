import {SchemaInterface} from "@/MetadataEditor/MetadataEditorSchemata/SchemaInterface";
import {EntityDataInterface, PredicateDefinitionsForType} from "@/Api/DataSchema/ApiEntity";
import {useState} from "react";
import HeaderSection from "@/ReactAPM/Components/MetadataEditor/HeaderSection";
import Section from "@/ReactAPM/Components/MetadataEditor/Section";
import './MetadataEditor.css';
import PredicateList from "@/ReactAPM/Components/MetadataEditor/PredicateList";
import {useQuery} from "@tanstack/react-query";
import {ApmApiClient} from "@/Api/ApmApiClient";


interface MetadataEditorProps {
  schema: SchemaInterface;
  entityData: EntityDataInterface;
  apiClient: ApmApiClient;

}


export default function MetadataEditor(props: MetadataEditorProps) {

  const schema = props.schema;
  const [entityData, setEntityData] = useState(props.entityData);

  const getDefsForType = async () => {
    return await props.apiClient.getPredicateDefinitionsForType(props.entityData.type);
  }

  const defsForTypeQueryResult = useQuery<PredicateDefinitionsForType>({
    queryKey: ['defsForType', props.entityData.type],
    queryFn: getDefsForType,
  });

  if (defsForTypeQueryResult.status === 'pending') {
    return (<div>Loading...</div>);
  }

  if (defsForTypeQueryResult.status === 'error') {
    return (<div>Error loading entity definitions: {defsForTypeQueryResult.error.message}</div>);
  }

  return (<div className="metadata-editor">
      { schema.sections.map( (section, index) => {
        if (section.type === 'Header') {
          return (<HeaderSection key={index} entityData={entityData}/>)
        }
        if (section.type === 'HorizontalList') {
          return(<PredicateList key={index} entityData={entityData} sectionSchema={section} type='horizontal' defsForType={defsForTypeQueryResult.data}/>);
        }
        if (section.type === 'VerticalList') {
          return(<PredicateList key={index} entityData={entityData} sectionSchema={section} type='vertical' defsForType={defsForTypeQueryResult.data}/>);
        }
        return (<Section key={index} sectionSchema={section} entityData={entityData} defsForType={defsForTypeQueryResult.data}/>)
      })}
    </div>
  )

}