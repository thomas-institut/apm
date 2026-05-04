import {useParams} from "react-router";
import {ReactNode, useContext, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {AppContext} from "@/ReactAPM/App";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {Tid} from "@/Tid/Tid";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {StatementDataInterface, StatementEditCommand} from "@/Api/DataSchema/ApiEntity";
import * as Entity from "@/constants/Entity";
import GenericStatementEditor from "./GenericStatementEditor";
import ConfirmDialog from "@/ReactAPM/Components/ConfirmDialog";
import {Button, Form, Table} from "react-bootstrap";
import {ApmFormats} from "@/pages/common/ApmFormats";
import './AdminEntity.css';
import {PredicateData} from "@/ReactAPM/Pages/AdminEntity/PredicateData";
import {TypeData} from "@/ReactAPM/Pages/AdminEntity/TypeData";

const TimestampPredicates = [Entity.pEntityCreationTimestamp, Entity.pStatementTimestamp, Entity.pCancellationTimestamp];
const UrlPredicates = [Entity.pUrl];
const MetadataPredicates = [Entity.pStatementAuthor, Entity.pStatementTimestamp, Entity.pStatementEditorialNote];

export default function AdminEntity() {
  const {id} = useParams();
  const context = useContext(AppContext);
  const apiClient = context.apiClient;

  const [editorProps, setEditorProps] = useState<any>(null);
  const [cancelDialogProps, setCancelDialogProps] = useState<any>(null);
  const [cancellationNote, setCancellationNote] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const entityId = id ? (isNaN(Number(id)) ? Tid.fromCanonicalString(id) : Number(id)) : null;

  if (!id || !entityId) {
    return <NormalPageContainer>Error: id is undefined</NormalPageContainer>;
  }

  const entityQuery = useQuery({
    queryKey: ['adminEntity', entityId],
    queryFn: () => apiClient.getEntityData(entityId, true),
  });

  const predicateDefsQuery = useQuery({
    queryKey: ['predicateDefs', entityQuery.data?.type],
    queryFn: () => entityQuery.data ? apiClient.getPredicateDefinitionsForType(entityQuery.data.type) : null,
    enabled: !!entityQuery.data
  });


  if (entityQuery.isLoading || predicateDefsQuery.isLoading) {
    return <NormalPageContainer>Loading entity data...</NormalPageContainer>;
  }

  if (entityQuery.isError || predicateDefsQuery.isError) {
    return <NormalPageContainer>Error loading entity data</NormalPageContainer>;
  }

  const data = entityQuery.data;

  if (data === undefined) {
    return <NormalPageContainer>Entity not found</NormalPageContainer>;
  }
  if (predicateDefsQuery.data === undefined || predicateDefsQuery.data === null) {
    return <NormalPageContainer>Error loading predicate definitions</NormalPageContainer>;
  }

  const predicateDefs = predicateDefsQuery.data.predicateDefinitions;
  const qualificationDefs = predicateDefsQuery.data.qualificationDefinitions;
  const predicatesAllowedAsSubject = predicateDefsQuery.data.predicatesAllowedAsSubject;
  const predicatesAllowedAsObject = predicateDefsQuery.data.predicatesAllowedAsObject;



  const handleEditStatement = (statement: StatementDataInterface) => {
    setEditorProps({
      show: true,
      statementId: statement.id,
      editableParts: [false, false, true],
      subject: entityId,
      predicate: statement.predicate,
      object: statement.object,
      relation: typeof statement.object === 'number',
      statementMetadata: statement.statementMetadata,
      predicateDef: predicateDefs[statement.predicate],
      qualificationDefs: qualificationDefs,
      onSuccess: () => entityQuery.refetch()
    });
  };

  const handleNewStatement = (predicate: number, asSubject: boolean) => {
    const def = predicateDefs[predicate];
    setEditorProps({
      show: true,
      statementId: null,
      editableParts: [!asSubject, false, asSubject],
      subject: asSubject ? entityId : null,
      predicate: predicate,
      object: asSubject ? null : entityId,
      relation: def.type === Entity.tRelation,
      statementMetadata: [],
      predicateDef: def,
      qualificationDefs: qualificationDefs,
      onSuccess: () => entityQuery.refetch()
    });
  };

  const handleCancelStatement = (statement: StatementDataInterface) => {
    setCancelDialogProps({
      show: true, statement: statement
    });
  };

  const handleAcceptCancel = async () => {
    if (!cancelDialogProps?.statement) return;
    setCancelling(true);
    setCancelError('');
    const commands: StatementEditCommand[] = [{
      command: 'cancel', statementId: cancelDialogProps.statement.id, cancellationNote: cancellationNote.trim()
    }];
    try {
      const response = await apiClient.apiEntityStatementsEdit(commands as any);
      if (response.success) {
        entityQuery.refetch().then();
        setCancelDialogProps(null);
        setCancellationNote('');
      } else {
        const errorMsg = response.commandResults?.map(r => `[${r.errorCode}] ${r.errorMessage}`).join(', ') || response.errorMessage || 'Unknown error';
        setCancelError(`Error: ${errorMsg}`);
      }
    } catch (e) {
      setCancelError(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCancelling(false);
    }
  };

  const getObjectValueType = (predicate: number) => {
    if (TimestampPredicates.includes(predicate)) return 'timestamp';
    if (UrlPredicates.includes(predicate)) return 'url';
    return 'literal';
  };

  const renderObject = (object: any, valueType: string) => {
    if (typeof object === 'number') {
      return <EntityLink id={object} type="admin"/>;
    }
    switch (valueType) {
      case 'timestamp':
        return <span className="timestamp-value" title={`TS: ${object}`}>{ApmFormats.time(parseInt(object))}</span>;
      case 'url':
        return <a href={object} className="url-value" target="_blank" rel="noreferrer"><i
          className="bi bi-link-45deg"></i> {object}</a>;
      default:
        return <span className="literal-value">{object}</span>;
    }
  };

  const renderStatementsTable = (statements: StatementDataInterface[]) => {
    if (statements.length === 0) return <em>None</em>;

    const sortedStatements = [...statements].sort((a, b) => a.predicate - b.predicate);

    return (<Table bordered className="statements">
      <thead>
      <tr>
        <th>Statement Id</th>
        <th>Subject</th>
        <th>Predicate</th>
        <th>Object</th>
        <th>Qualifications</th>
        <th>Statement Metadata</th>
        <th>Actions</th>
      </tr>
      </thead>
      <tbody>
      {sortedStatements.map(statement => {
        const isCancelled = statement.cancellationId !== -1;
        const metadataItems: ReactNode[] = [];
        const qualificationItems: ReactNode[] = [];
        const cancellationItems: ReactNode[] = [];

        statement.statementMetadata.forEach(([predicate, obj], idx) => {
          const item = (<div key={`${statement.id}-${predicate}-${idx}`}>
            <EntityLink id={predicate} type="admin"/>: {renderObject(obj, getObjectValueType(predicate))}
          </div>);
          if (MetadataPredicates.includes(predicate)) {
            metadataItems.push(item);
          } else {
            qualificationItems.push(item);
          }
        });

        statement.cancellationMetadata.forEach(([predicate, obj], idx) => {
          cancellationItems.push(<div key={`cancel-${statement.id}-${predicate}-${idx}`}>
            <EntityLink id={predicate} type="admin"/>: {renderObject(obj, getObjectValueType(predicate))}
          </div>);
        });

        const predicateDef = predicateDefs[statement.predicate];
        const isSystem = predicateDef?.flags?.includes(5) || statement.id === -1;
        const isEditable = !isCancelled && !isSystem;
        const isCancellable = predicateDef?.canBeCancelled && !isSystem;

        return (<tr key={statement.id} className={isCancelled ? 'cancelled-row' : ''}>
          <td>{statement.id === -1 ? 'System Statement' : statement.id}</td>
          <td><EntityLink id={statement.subject} type="admin"/></td>
          <td><EntityLink id={statement.predicate} type="admin"/></td>
          <td>{renderObject(statement.object, getObjectValueType(statement.predicate))}</td>
          <td>{qualificationItems}</td>
          <td>{metadataItems} </td>
          <td>
            <div className={'actions-div'}>
              {/*{isCancelled ? <div><Badge bg="secondary" className="me-1">Cancelled</Badge></div> :*/}
              {/*  <div><Badge bg="success" className="me-1">Active</Badge></div>}*/}
              {isSystem && <div className="system-data-label">System data, editing disabled</div>}
              {!isSystem && (<div className={'action-buttons-div'}>
                {isEditable && <Button variant="outline-secondary" size="sm"
                                       onClick={() => handleEditStatement(statement)}>Edit</Button>}
                {isCancellable && !isCancelled && (<Button variant="outline-secondary" size="sm"
                                                           onClick={() => handleCancelStatement(statement)}>Cancel</Button>)}
              </div>)}
              {isCancelled && <div>{cancellationItems}</div>}
            </div>
          </td>
        </tr>);
      })}
      </tbody>
    </Table>);
  };

  const getAvailablePredicates = (asSubject: boolean) => {
    const list = asSubject ? predicatesAllowedAsSubject : predicatesAllowedAsObject;
    return list.filter(p => {
      const def = predicateDefs[p];
      if (!def || (def.flags && def.flags.length > 0)) return false;
      const isUsed = data.statements.some(s => s.predicate === p && s.cancellationId === -1);
      return !(asSubject && def.singleProperty && isUsed);
    });
  };

  const renderAvailablePredicates = (asSubject: boolean) => {
    const available = getAvailablePredicates(asSubject);
    if (available.length === 0) return null;

    return (<div className="available-predicates mt-3">
      <h6>Predicates Available for {asSubject ? 'Subject' : 'Object'}</h6>
      <Table size="sm" className="w-auto">
        <tbody>
        {available.map(p => (<tr key={p}>
          <td><EntityLink id={p} type="admin"/></td>
          <td>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => handleNewStatement(p, asSubject)}
              title={`Click to create a new statement with the entity as ${asSubject ? 'subject' : 'object'}`}
            >
              New Statement
            </Button>
          </td>
        </tr>))}
        </tbody>
      </Table>
    </div>);
  };

  function getNonAdminEntityLink(type: number, entityId: number) {
    let linkType: 'document' | 'work' | 'person' | null = null;

    switch (type) {
      case Entity.tDocument:
        linkType = 'document';
        break;
      case Entity.tWork:
        linkType = 'work';
        break;
      case Entity.tPerson:
        linkType = 'person';
        break;
    }
    if (linkType === null) return null;
    return <EntityLink id={entityId} type={linkType} useUrlAsLabel={true}/>;
  }

  const apmUrl = getNonAdminEntityLink(data.type, entityId);
  const isSystemEntity = data.id <= Entity.MaxSystemEntityId;
  const isPredicate = data.type === Entity.tRelation || data.type === Entity.tAttribute;
  const isType = data.type === Entity.tEntityType;

  return (<NormalPageContainer>
    <h1>Entity {isSystemEntity ? entityId : Tid.toBase36String(entityId)} {isPredicate && '(Predicate)'}</h1>
    <div className={'basic-data'}>
      {!isSystemEntity && <div key={'id'}><b>Numerical Id</b>: {entityId}</div>}
      {!isSystemEntity && <div key={'url'}><b>Apm Url</b>: {apmUrl ?? 'None'}</div>}
      <div key={'type'}><b>Type</b>: <EntityLink id={data.type} type="admin"/></div>
      <div key={'name'}><b>Name</b>: <span className={'literal-value'}>{data.name}</span></div>
      {!isSystemEntity && <div key={'mergedInto'}><b>Merged Into</b>: {data.mergedInto === null ? 'null' :
        <EntityLink id={data.mergedInto} type={'admin'}/>}</div>}
    </div>

    {!isSystemEntity && (<>
        <h3>Statements as Subject</h3>
        {renderStatementsTable(data.statements)}
        {renderAvailablePredicates(true)}

        <h3>Statements as Object</h3>
        {renderStatementsTable(data.statementsAsObject)}
        {renderAvailablePredicates(false)}
      </>)
    }
    {isPredicate && <PredicateData id={data.id} def={predicateDefs[data.id]}/> }
    {isType && <TypeData type={data.id}/>}

    {editorProps && (<GenericStatementEditor
      {...editorProps}
      onHide={() => setEditorProps(null)}
    />)}

    {cancelDialogProps && (<ConfirmDialog
      show={cancelDialogProps.show}
      onHide={() => {
        setCancelDialogProps(null);
        setCancellationNote('');
        setCancelError('');
      }}
      title="Cancel statement"
      body={<div>
        <p>Do you want to cancel statement {cancelDialogProps.statement.id}?</p>
        <p className="border p-2 bg-light rounded">
          <b>Subject</b>: <EntityLink id={cancelDialogProps.statement.subject} type="admin"/><br/>
          <b>Predicate</b>: <EntityLink id={cancelDialogProps.statement.predicate} type="admin"/><br/>
          <b>Object</b>: {typeof cancelDialogProps.statement.object === 'number' ?
          <EntityLink id={cancelDialogProps.statement.object}
                      type="admin"/> : `'${cancelDialogProps.statement.object}'`}
        </p>
        <Form.Group className="mt-3">
          <Form.Label>Cancellation Note</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={cancellationNote}
            onChange={(e) => setCancellationNote(e.target.value)}
            placeholder="Enter a reason for cancellation..."
            disabled={cancelling}
          />
        </Form.Group>
        {cancelError && <div className="text-danger mt-2">{cancelError}</div>}
      </div>}
      onAccept={handleAcceptCancel}
      acceptButtonLabel={cancelling ? "Cancelling..." : "Yes, do it"}
      cancelButtonLabel="No"
    />)}
  </NormalPageContainer>);
}