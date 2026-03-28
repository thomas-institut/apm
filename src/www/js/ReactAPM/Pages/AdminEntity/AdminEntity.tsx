import {useParams} from "react-router";
import {ReactNode, useContext, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {AppContext} from "@/ReactAPM/App";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {Tid} from "@/Tid/Tid";
import EntityLink from "@/ReactAPM/Components/EntityLink";
import {StatementDataInterface} from "@/Api/DataSchema/ApiEntity";
import * as Entity from "@/constants/Entity";
import GenericStatementEditor from "./GenericStatementEditor";
import ConfirmDialog from "@/ReactAPM/Components/ConfirmDialog";
import {Badge, Button, Form, Table} from "react-bootstrap";
import {capitalizeFirstLetter} from "@/toolbox/Util";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {ApmUrlGenerator} from "@/ApmUrlGenerator";

const TimestampPredicates = [2004, 3002, 5002];
const UrlPredicates = [2009];
const MetadataPredicates = [3001, 3002, 3003];

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

  const entityQuery = useQuery({
    queryKey: ['adminEntity', entityId],
    queryFn: () => entityId ? apiClient.getEntityData(entityId, true) : null,
    enabled: !!entityId
  });

  const predicateDefsQuery = useQuery({
    queryKey: ['predicateDefs', entityQuery.data?.type],
    queryFn: () => entityQuery.data ? apiClient.getPredicateDefinitionsForType(entityQuery.data.type) : null,
    enabled: !!entityQuery.data
  });

  if (!id || !entityId) {
    return <NormalPageContainer>Error: id is undefined</NormalPageContainer>;
  }

  if (entityQuery.isLoading || predicateDefsQuery.isLoading) {
    return <NormalPageContainer>Loading entity data...</NormalPageContainer>;
  }

  if (entityQuery.isError || predicateDefsQuery.isError) {
    return <NormalPageContainer>Error loading entity data</NormalPageContainer>;
  }

  const data = entityQuery.data;
  const predicateDefs = predicateDefsQuery.data?.predicateDefinitions || {};
  const qualificationDefs = predicateDefsQuery.data?.qualificationDefinitions || {};
  const predicatesAllowedAsSubject = predicateDefsQuery.data?.predicatesAllowedAsSubject || [];
  const predicatesAllowedAsObject = predicateDefsQuery.data?.predicatesAllowedAsObject || [];

  if (!data) {
    return <NormalPageContainer>Entity not found</NormalPageContainer>;
  }

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
      editableParts: [false, false, true],
      subject: asSubject ? entityId : null,
      predicate: predicate,
      object: null,
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
    const commands = [{
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

    return (<Table striped bordered hover responsive className="statements mt-2">
        <thead>
        <tr>
          <th>Statement Id</th>
          <th>Subject</th>
          <th>Predicate</th>
          <th>Object</th>
          <th>Qualifications</th>
          <th>Statement Metadata</th>
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

          return (<tr key={statement.id} className={isCancelled ? 'table-secondary text-muted' : ''}>
              <td className={isCancelled ? 'text-decoration-line-through' : ''}>{statement.id}</td>
              <td className={isCancelled ? 'text-decoration-line-through' : ''}><EntityLink id={statement.subject}
                                                                                            type="admin"/></td>
              <td className={isCancelled ? 'text-decoration-line-through' : ''}><EntityLink id={statement.predicate}
                                                                                            type="admin"/></td>
              <td
                className={isCancelled ? 'text-decoration-line-through' : ''}>{renderObject(statement.object, getObjectValueType(statement.predicate))}</td>
              <td className={isCancelled ? 'text-decoration-line-through' : ''}>{qualificationItems}</td>
              <td>
                <div className={isCancelled ? 'text-decoration-line-through' : ''}>
                  {metadataItems}
                </div>
                {!isCancelled && (<div className="mt-2">
                    <Badge bg="success" className="me-1">Active</Badge>
                    {predicateDef?.flags?.includes(5) ? (
                      <span className="text-muted small">System data, editing disabled</span>) : (
                      <div className="mt-1 d-flex gap-1">
                        {predicateDef?.canBeCancelled && (<Button variant="outline-danger" size="sm"
                                                                  onClick={() => handleCancelStatement(statement)}>Cancel</Button>)}
                        <Button variant="outline-primary" size="sm"
                                onClick={() => handleEditStatement(statement)}>Edit</Button>
                      </div>)}
                  </div>)}
                {isCancelled && <div className="mt-2 text-danger small">Cancelled:<br/>{cancellationItems}</div>}
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

  const urlGen = new ApmUrlGenerator(context.baseUrl);
  const apmUrl = urlGen.siteEntityPage(data.type, entityId);

  return (<NormalPageContainer>
      <h1>Entity {entityId} <small className="text-muted"> = {Tid.toBase36String(entityId)}</small></h1>
      <p className="mb-4">
        Apm Url: {apmUrl ? <a href={apmUrl}>{apmUrl}</a> : <i>None</i>}
      </p>

      <h2 className="mt-4">Basic Data</h2>
      <div className="basic-data border p-3 rounded bg-light mb-4">
        {Object.entries(data).map(([key, val]) => {
          if (['statements', 'statementsAsObject', 'id'].includes(key)) return null;
          let valContent;
          if (val === null) valContent = 'null'; else if (typeof val === 'number') valContent =
            <EntityLink id={val} type="admin"/>; else valContent = `'${val}'`;

          return (<p key={key} className="mb-1">
              <strong>{capitalizeFirstLetter(key)}</strong>: {valContent}
            </p>);
        })}
      </div>

      <h3 className="mt-4">Statements as Subject</h3>
      {renderStatementsTable(data.statements)}
      {renderAvailablePredicates(true)}

      <h3 className="mt-4">Statements as Object</h3>
      {renderStatementsTable(data.statementsAsObject)}
      {renderAvailablePredicates(false)}

      <div className="entity-data-dump mt-5 border-top pt-4">
        <h3>Json</h3>
        <pre className="bg-light p-3 border rounded small overflow-auto" style={{maxHeight: '400px'}}>
            {JSON.stringify(data, null, 3)}
        </pre>
      </div>

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