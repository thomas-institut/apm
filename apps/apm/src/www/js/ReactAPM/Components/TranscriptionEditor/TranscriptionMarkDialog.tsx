import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

export interface TranscriptionMarkData {
  value: string;
  handId: number;
  editorialNote: string;
}

interface TranscriptionMarkDialogProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (data: TranscriptionMarkData) => void;
  initialData?: TranscriptionMarkData;
  handIdLimit: number;
  title: string;
  label: string;
  placeholder: string;
}

/**
 * Modal dialog for entering transcription mark parameters (Abbreviation, Sic, etc.).
 */
export default function TranscriptionMarkDialog({
  show,
  onHide,
  onSubmit,
  initialData,
  handIdLimit,
  title,
  label,
  placeholder,
}: TranscriptionMarkDialogProps) {
  const [value, setValue] = useState('');
  const [handId, setHandId] = useState(1);
  const [editorialNote, setEditorialNote] = useState('');

  useEffect(() => {
    if (show) {
      setValue(initialData?.value || '');
      setHandId(initialData?.handId || 1);
      setEditorialNote(initialData?.editorialNote || '');
    }
  }, [show, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ value, handId, editorialNote });
    onHide();
  };

  const handOptions = [];
  for (let i = 1; i <= handIdLimit; i++) {
    handOptions.push(
      <option key={i} value={i}>
        Hand {i}
      </option>
    );
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>{label}</Form.Label>
            <Form.Control
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Hand ID</Form.Label>
            <Form.Select
              value={handId}
              onChange={(e) => setHandId(parseInt(e.target.value))}
            >
              {handOptions}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Editorial Note (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={editorialNote}
              onChange={(e) => setEditorialNote(e.target.value)}
              placeholder="Enter optional editorial note"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Apply
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
