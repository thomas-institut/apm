import {SectionSchema} from "@/MetadataEditor/MetadataEditorSchemata/SchemaInterface";
import {EntityDataInterface, PredicateDefinitionsForType} from "@/Api/DataSchema/ApiEntity";
import {EntityData} from "@/EntityData/EntityData";


export interface MetadataEditorSectionProps {
  sectionSchema: SectionSchema;
  entityData: EntityDataInterface;
  defsForType: PredicateDefinitionsForType;
}


export default function Section(props: MetadataEditorSectionProps) {

  const schema = props.sectionSchema;
  const data = props.entityData;

  return (<div className="mde-section">
    <h2>Section type {schema.type}</h2>
    <ul>
      {schema.predicates.map((predicate, index) => (<li
          key={index}>Predicate {predicate.id}: {EntityData.getPredicateObject(data, predicate.id) ?? '--- not set ---'}</li>))}
    </ul>

  </div>);

}