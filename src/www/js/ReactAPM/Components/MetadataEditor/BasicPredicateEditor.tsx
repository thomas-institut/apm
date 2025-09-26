import {PredicateDefinitionInterface, StatementDataInterface} from "@/Api/DataSchema/ApiEntity";
import {useState} from "react";
import {StatementArray} from "@/EntityData/StatementArray";
import {urlGen} from "@/pages/common/SiteUrlGen";
import {Link45deg} from "react-bootstrap-icons";

interface BasicPredicateEditorProps {
  predicateDefinition: PredicateDefinitionInterface;
  qualificationDefinitions: { [key: number]: PredicateDefinitionInterface };
  statements: StatementDataInterface[];
  showUrl?: boolean;
  showLabel?: boolean;
  label?: string;
  logoUrl?: string;
  multiLineInput?: boolean;
  getObjectUrl: (object: number | string) => Promise<string | null>;
  initialMode?: 'show' | 'edit';
  readOnly?: boolean;
  // getEntityName: (id: number) => Promise<string>;
  // getEntityType: (id: number) => Promise<number>;
  // getAllEntitiesForTypes: (types: number[]) => Promise<number[]>;
  // onSaveStatement: (newObject: string | number, qualifications: any, editorialNote: string, statementId: number, cancellationNote: string) => Promise<EditStatementResult>;
  // onCancelStatement: (statementId: number, cancellationNote: string) => Promise<EditStatementResult>;
}


export default function BasicPredicateEditor(props: BasicPredicateEditorProps) {
  const def = props.predicateDefinition;
  const showLabel = props.showLabel ?? true;
  const qualifications = props.qualificationDefinitions;
  const statements = props.statements;
  const showUrl = props.showUrl ?? false;


  const label = showLabel ? (props.label !== undefined ? props.label : def.name) : null;
  const logoUrl = props.logoUrl ?? '';
  const readOnly = props.readOnly ?? false;

  const [currentMode, setCurrentMode] = useState<'show' | 'edit'>(readOnly ? 'show' : (props.initialMode ?? 'show'));


  const currentStatements = StatementArray.getCurrentStatements(props.statements);
  const currentObject: string | number | null = currentStatements[0]?.object ?? null;


  let labelArea = <span className="mde-predicate-label"><b>{label}</b>:</span>;

  if (logoUrl !== '') {
    labelArea = <img src={logoUrl} className="mde-predicate-logo" alt={label ?? `Predicate ${def.id}`}/>;
  }

  let objectArea = currentObject !== null ? <span>{currentObject}</span> : (<em>No data</em>);
  if (showUrl && typeof currentObject === 'string') {
    const objectUrl = urlGen.entityExternalUrl(def.id, currentObject);
    if (objectUrl !== '') {
      objectArea = <a href={objectUrl} target="_blank" rel="noreferrer">{currentObject} <Link45deg/></a>;
    }
  }


  return (<div className={['mde-predicate', 'mde-predicate-' + def.id].join(' ')}>
    {labelArea} {objectArea}
  </div>);


}