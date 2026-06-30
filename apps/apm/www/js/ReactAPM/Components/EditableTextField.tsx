import { useState, useEffect, useRef, CSSProperties, KeyboardEvent } from 'react';
import { Pencil, Check, X } from 'react-bootstrap-icons';

interface EditableTextFieldProps {
  text: string;
  className?: string;
  editingClassName?: string;
  style?: CSSProperties;
  onConfirm: (newText: string) => void;
}

/**
 * A React component that mimics the general behaviour of the legacy EditableTextField widget.
 * It displays text that can be edited in-place.
 */
export default function EditableTextField(props: EditableTextFieldProps) {
  const {
    text,
    className,
    editingClassName,
    style,
    onConfirm
  } = props;

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editedText with text prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setEditedText(text);
    }
  }, [text, isEditing]);

  // Focus and move cursor to end when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(editedText.length, editedText.length);
    }
  }, [isEditing, editedText.length]);

  const handleConfirm = () => {
    onConfirm(editedText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm();
      e.stopPropagation();
    } else if (e.key === 'Escape') {
      handleCancel();
      e.stopPropagation();
    }
  };

  if (isEditing) {
    // Mimic the size logic from the legacy widget
    const size = Math.min(Math.max(editedText.length, 5), 20);
    return (
      <div className={`etf-editing ${editingClassName ?? className ?? ''}`} style={{ ...style, display: 'inline-flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          className="textInput"
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          onKeyDown={handleKeyDown}
          size={size}
          style={{ width: `${size + 1}ch` }}
        />
        &nbsp;
        <Check
          className="confirmButton"
          onClick={(e) => {
            e.stopPropagation();
            handleConfirm();
          }}
          style={{ cursor: 'pointer' }}
          title="Confirm"
        />
        &nbsp;
        <X
          className="cancelButton"
          onClick={(e) => {
            e.stopPropagation();
            handleCancel();
          }}
          style={{ cursor: 'pointer' }}
          title="Cancel"
        />
      </div>
    );
  }

  return (
    <div
      className={`${isHovered ? 'etf-hover' : 'etf-normal'} ${className || ''}`}
      style={{ ...style, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsEditing(true)}
    >
      <span className="theText" title="Click to edit">{text}</span>
      {isHovered && (
        <>
          &nbsp;
          <Pencil className="editButton" title="Edit" />
        </>
      )}
    </div>
  );
}
