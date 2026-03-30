import {Button, Form, Modal} from "react-bootstrap";
import {ReactNode, useContext, useEffect, useState} from "react";
import {AppContext} from "@/ReactAPM/App";
import {
  PredicateDefinitionInterface, QualificationDuple, StatementEditCommand, StatementMetadata
} from "@/Api/DataSchema/ApiEntity";
import * as Entity from "@/constants/Entity";

interface GenericStatementEditorProps {
  show: boolean;
  onHide: () => void;
  onSuccess: () => void;
  statementId: number | null;
  editableParts: [boolean, boolean, boolean];
  subject: number | null;
  predicate: number;
  relation: boolean;
  object: string | number | null;
  predicateDef: PredicateDefinitionInterface;
  qualificationDefs: Record<number, PredicateDefinitionInterface>;
  statementMetadata: StatementMetadata[];
}

/**
 * A component for editing or creating statements.
 * Based on the legacy GenericStatementEditor class.
 */
export default function GenericStatementEditor(props: GenericStatementEditorProps) {
  const {
    show,
    onHide,
    onSuccess,
    statementId,
    editableParts,
    subject: initialSubject,
    predicate,
    relation,
    object: initialObject,
    predicateDef,
    qualificationDefs,
    statementMetadata
  } = props;

  const context = useContext(AppContext);
  const apiClient = context.apiClient;

  const [editSubject, , editObject] = editableParts;
  const [subject, setSubject] = useState<number>(initialSubject ?? -1);
  const [object, setObject] = useState<string | number>(initialObject ?? '');
  const [editorialNote, setEditorialNote] = useState<string>('');
  const [cancellationNote, setCancellationNote] = useState<string>('');
  const [qualifications, setQualifications] = useState<QualificationDuple[]>([]);
  const [info, setInfo] = useState<string | ReactNode>('');
  const [saving, setSaving] = useState<boolean>(false);

  const [subjectName, setSubjectName] = useState<string>('');
  const [predicateName, setPredicateName] = useState<string>('');
  const [objectName, setObjectName] = useState<string>('');

  const [qualificationEntities, setQualificationEntities] = useState<Record<number, {
    id: number, name: string
  }[]>>({});

  useEffect(() => {
    if (show) {
      const fetchBaseNames = async () => {
        if (subject !== -1) {
          apiClient.getEntityName(subject).then(setSubjectName);
        }
        apiClient.getEntityName(predicate).then(setPredicateName);
        if (relation && object !== '') {
          apiClient.getEntityName(Number(object)).then(setObjectName);
        }
      };
      fetchBaseNames().then();

      const allowed = predicateDef.allowedQualifications ?? [];
      const initialQuals: QualificationDuple[] = statementMetadata
      .filter(([id]) => allowed.includes(id))
      .map(([id, val]) => [id, val]);
      setQualifications(initialQuals);

      const fetchQualEntities = async () => {
        const qEntities: Record<number, { id: number, name: string }[]> = {};
        for (const qp of allowed) {
          const def = qualificationDefs[qp];
          if (def && def.type === Entity.tRelation && def.allowedObjectTypes) {
            let entities: number[] = [];
            for (const typeTid of def.allowedObjectTypes) {
              const list = await apiClient.getEntityListForType(typeTid);
              entities = entities.concat(list);
            }
            const entityData = await Promise.all(entities.map(async id => ({
              id, name: await apiClient.getEntityName(id)
            })));
            entityData.sort((a, b) => a.name.localeCompare(b.name));
            qEntities[qp] = entityData;
          }
        }
        setQualificationEntities(qEntities);
      };
      fetchQualEntities().then();
    }
  }, [show, initialSubject, predicate, initialObject, relation, apiClient, predicateDef.allowedQualifications, statementMetadata, qualificationDefs]);

  const handleSave = async () => {
    setSaving(true);
    setInfo('');

    const commands: StatementEditCommand[] = [];
    if (statementId !== null && predicateDef.canBeCancelled) {
      commands.push({
        command: 'cancel', statementId: statementId, cancellationNote: cancellationNote.trim()
      });
    }

    commands.push({
      command: 'create',
      subject: subject,
      predicate: predicate,
      object: relation ? (typeof object === 'number' ? object : parseInt(object as string)) : object.toString(),
      qualifications: qualifications,
      editorialNote: editorialNote.trim(),
      cancellationNote: cancellationNote.trim()
    });

    try {
      const response = await apiClient.apiEntityStatementsEdit(commands);
      if (response.success) {
        onSuccess();
        onHide();
      } else {
        const errorMsg = response.commandResults?.map(r => `[${r.errorCode}] ${r.errorMessage}`).join(', ') || response.errorMessage || 'Unknown error';
        setInfo(`Error: ${errorMsg}`);
      }
    } catch (e) {
      setInfo(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const isChanged = () => {
    if (subject !== (initialSubject ?? -1)) return true;
    if (object !== (initialObject ?? '')) return true;
    if (editorialNote.trim() !== '') return true;
    if (cancellationNote.trim() !== '') return true;
    const allowed = predicateDef.allowedQualifications ?? [];
    const initialQuals = statementMetadata.filter(([id]) => allowed.includes(id));
    if (qualifications.length !== initialQuals.length) return true;
    for (const [id, val] of qualifications) {
      const initial = initialQuals.find(([iid]) => iid === id);
      if (!initial || initial[1] !== val) return true;
    }
    return false;
  };

  const validate = () => {
    const errors: string[] = [];
    if (subject <= 0) errors.push('Subject must be a positive integer');
    if (object === '') errors.push('Object cannot be empty');
    if (relation && (isNaN(Number(object)) || Number(object) <= 0)) errors.push('Object must be a positive integer');
    if (editorialNote.trim() === '') errors.push('Editorial note cannot be empty');
    return errors;
  };

  const validationErrors = validate();
  const changed = isChanged();
  const canSave = changed && validationErrors.length === 0;

  return (<Modal show={show} onHide={onHide} size="lg">
    <Modal.Header closeButton>
      <Modal.Title>{statementId === null ? "Create New Statement" : "Edit Statement"}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {statementId !== null && (<div className="mb-3 text-muted">
        This will cancel the given statement and will create a new one with the edited changes.
      </div>)}
      <Form>
        <Form.Group className="row mb-2">
          <Form.Label className="col-sm-3">Statement Id</Form.Label>
          <div className="col-sm-9">{statementId ?? <em>new</em>}</div>
        </Form.Group>
        <Form.Group className="row mb-2">
          <Form.Label className="col-sm-3">Subject</Form.Label>
          <div className="col-sm-9">
            {editSubject ? (<Form.Control
              type="number"
              value={subject === -1 ? '' : subject}
              onChange={e => setSubject(parseInt(e.target.value) || -1)}
            />) : (`${subject} ${subjectName ? `[${subjectName}]` : ''}`)}
          </div>
        </Form.Group>
        <Form.Group className="row mb-2">
          <Form.Label className="col-sm-3">Predicate</Form.Label>
          <div className="col-sm-9">{predicate} {predicateName ? `[${predicateName}]` : ''}</div>
        </Form.Group>
        <Form.Group className="row mb-2">
          <Form.Label className="col-sm-3">{relation ? 'Object' : 'Value'}</Form.Label>
          <div className="col-sm-9">
            {editObject ? (relation ? (<Form.Control
              type="text"
              value={object}
              onChange={e => setObject(e.target.value)}
            />) : (<Form.Control
              as="textarea"
              rows={5}
              value={object}
              onChange={e => setObject(e.target.value)}
            />)) : (relation ? `${object} ${objectName ? `[${objectName}]` : ''}` : object)}
          </div>
        </Form.Group>

        {(predicateDef.allowedQualifications ?? []).map(qp => {
          const def = qualificationDefs[qp];
          if (!def) return null;
          const value = qualifications.find(([id]) => id === qp)?.[1] ?? '';

          const handleChange = (val: string | number) => {
            const newQuals = qualifications.filter(([id]) => id !== qp);
            if (val !== '') {
              newQuals.push([qp, val]);
            }
            setQualifications(newQuals);
          };

          return (<Form.Group className="row mb-2" key={qp}>
            <Form.Label className="col-sm-3">{def.name}</Form.Label>
            <div className="col-sm-9">
              {def.type === Entity.tRelation ? (<Form.Select
                value={value}
                onChange={e => handleChange(e.target.value === '' ? '' : parseInt(e.target.value))}
              >
                <option value=""></option>
                {(qualificationEntities[qp] ?? []).map(ent => (
                  <option key={ent.id} value={ent.id}>{ent.name}</option>))}
              </Form.Select>) : (<Form.Control
                type={def.allowedObjectTypes?.includes(Entity.ValueTypeInteger) ? 'number' : 'text'}
                value={value}
                onChange={e => handleChange(e.target.value)}
              />)}
            </div>
          </Form.Group>);
        })}

        <Form.Group className="row mb-2">
          <Form.Label className="col-sm-3">Editorial Note</Form.Label>
          <div className="col-sm-9">
            <Form.Control
              as="textarea"
              rows={3}
              value={editorialNote}
              onChange={e => setEditorialNote(e.target.value)}
            />
          </div>
        </Form.Group>

        {statementId !== null && (<Form.Group className="row mb-2">
          <Form.Label className="col-sm-3">Cancellation Note</Form.Label>
          <div className="col-sm-9">
            <Form.Control
              as="textarea"
              rows={3}
              value={cancellationNote}
              onChange={e => setCancellationNote(e.target.value)}
            />
          </div>
        </Form.Group>)}
      </Form>
      {info && <div className="text-danger mt-2">{info}</div>}
      {!canSave && changed && validationErrors.length > 0 && (<div className="text-danger mt-2">
        {validationErrors.map((err, i) => <div key={i}>{err}</div>)}
      </div>)}
      {!changed && show && <div className="text-info mt-2">No change in data</div>}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="primary" onClick={handleSave} disabled={!canSave || saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
      <Button variant="secondary" onClick={onHide} disabled={saving}>
        Cancel
      </Button>
    </Modal.Footer>
  </Modal>);
}
