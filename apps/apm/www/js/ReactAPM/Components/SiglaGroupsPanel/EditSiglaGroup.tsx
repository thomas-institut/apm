import {useEffect, useState} from 'react';
import {Button, Form, Modal} from 'react-bootstrap';
import {SiglaGroupInterface} from '@/CtData/CtDataInterface';
import './EditSiglaGroup.css';

interface EditSiglaGroupProps {
  sigla: string[];
  siglaGroup: SiglaGroupInterface;
  siglaGroupIndex: number;
  isSiglaGroupValid: (siglaGroupIndex: number, group: SiglaGroupInterface) => true | string;
  onClickConfirm: (siglaGroupIndex: number, group: SiglaGroupInterface) => void;
  onClickCancel: () => void;
}

export default function EditSiglaGroup({
                                         sigla,
                                         siglaGroup,
                                         siglaGroupIndex,
                                         isSiglaGroupValid,
                                         onClickConfirm,
                                         onClickCancel
                                       }: EditSiglaGroupProps) {

  const [editedGroup, setEditedGroup] = useState<SiglaGroupInterface>({
    siglum: siglaGroup.siglum,
    witnesses: [...siglaGroup.witnesses]
  });
  const [validationResult, setValidationResult] = useState<true | string>(true);

  useEffect(() => {
    const group = {
      siglum: siglaGroup.siglum,
      witnesses: [...siglaGroup.witnesses]
    };
    setEditedGroup(group);
    setValidationResult(isSiglaGroupValid(siglaGroupIndex, group));
  }, [siglaGroup, siglaGroupIndex, isSiglaGroupValid]);

  const validateAndSetGroup = (group: SiglaGroupInterface) => {
    setEditedGroup(group);
    setValidationResult(isSiglaGroupValid(siglaGroupIndex, group));
  };

  const toggleWitness = (witnessIndex: number, checked: boolean) => {
    const witnesses = checked
      ? [...editedGroup.witnesses, witnessIndex]
      : editedGroup.witnesses.filter(index => index !== witnessIndex);

    validateAndSetGroup({
      ...editedGroup,
      witnesses: witnesses.sort((a, b) => a - b)
    });
  };

  return <Modal show={true} onHide={onClickCancel}>
    <Modal.Header closeButton>
      <Modal.Title>{siglaGroupIndex === -1 ? 'Add Sigla Group' : 'Edit Sigla Group'}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form.Group className={'sigla-group-siglum'}>
        <Form.Label>Group siglum</Form.Label>
        <Form.Control
          className={'sigla-group-siglum-input'}
          value={editedGroup.siglum}
          onChange={(event) => {
            validateAndSetGroup({
              ...editedGroup,
              siglum: event.target.value
            });
          }}
        />
      </Form.Group>

      <div className={'sigla-checkboxes'}>
        <div className={'sigla-checkboxes-title'}>Witnesses</div>
        {sigla.map((currentSiglum, index) => {
          return <Form.Check
            key={index}
            className={'sigla-checkbox'}
            label={currentSiglum}
            type={'checkbox'}
            checked={editedGroup.witnesses.includes(index)}
            onChange={(event) => {
              toggleWitness(index, event.target.checked);
            }}
          />;
        })}
      </div>
    </Modal.Body>
    <Modal.Footer>
      {validationResult !== true && <div className={'validation-message text-danger'}>{validationResult}</div>}
      <Button className={'cancel-btn'} variant={'secondary'} onClick={onClickCancel}>Cancel</Button>
      <Button
        className={'confirm-btn'}
        variant={'primary'}
        disabled={validationResult !== true}
        onClick={() => {
          onClickConfirm(siglaGroupIndex, {
            siglum: editedGroup.siglum,
            witnesses: [...editedGroup.witnesses]
          });
        }}
      >
        Confirm
      </Button>
    </Modal.Footer>
  </Modal>;
}