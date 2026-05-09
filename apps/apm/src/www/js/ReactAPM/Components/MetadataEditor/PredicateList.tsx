import {CSSProperties} from "react";
import BasicPredicateEditor from "@/ReactAPM/Components/MetadataEditor/BasicPredicateEditor";
import {StatementArray} from "@/EntityData/StatementArray";
import {EntityDataInterface, PredicateDefinitionsForType} from "@/Api/DataSchema/ApiEntity";
import {SectionSchema} from "@/MetadataEditor/MetadataEditorSchemata/SchemaInterface";
import {urlGen} from "@/pages/common/SiteUrlGen";


interface PredicateListProps {
  sectionSchema: SectionSchema;
  entityData: EntityDataInterface;
  defsForType: PredicateDefinitionsForType;
  type: 'horizontal' | 'vertical';
}

export default function PredicateList(props: PredicateListProps) {
  const data = props.entityData;
  const schema = props.sectionSchema;
  const type = props.type;
  const defsForType = props.defsForType;

  const VerticalStyle: CSSProperties = {
    // display: 'flex', flexDirection: 'column',
  };

  const HorizontalStyle: CSSProperties = {
    // display: 'flex', flexDirection: 'row', gap: '1em'
  };

  const getObjectUrl = (object: string | number) => {
    return Promise.resolve(null);
  };
  const getEntityName = (entityId: number) => {
    return Promise.resolve(entityId.toString());
  };

  return (<div className="mde-section">
    {schema.title ? (<div className='mde-section-title'>{schema.title}</div>) : null}
    <div style={type === 'horizontal' ? HorizontalStyle : VerticalStyle} className={['mde-section-body', 'mde-predicate-list-' + type].join(' ')}>
      {schema.predicates.map((def) => {

        const statements = StatementArray.getStatementsForPredicate(data.statements, def.id, true);
        const logoUrl = def.showLogo ? urlGen.entityLogoUrl(def.id) : undefined;


        return (<BasicPredicateEditor key={def.id} predicateDefinition={props.defsForType.predicateDefinitions[def.id]}
                                      qualificationDefinitions={defsForType.qualificationDefinitions} showUrl={def.showUrl}
                                      statements={statements} getObjectUrl={getObjectUrl} logoUrl={logoUrl}/>);
      })}
    </div>
  </div>);


}