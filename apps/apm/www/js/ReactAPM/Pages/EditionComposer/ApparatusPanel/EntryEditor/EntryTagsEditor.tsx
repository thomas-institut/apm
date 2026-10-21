import {useId, useState} from "react";
import {Button} from "react-bootstrap";

const defaultTagHints = ['revise', 'remove', 'disjunctive error'];

interface EntryTagsEditorProps {
  tags: string[];
  hints?: string[];
  onChange: (tags: string[]) => void;
}

export default function EntryTagsEditor({tags, hints = defaultTagHints, onChange}: EntryTagsEditorProps) {
  const [newTag, setNewTag] = useState('');
  const listId = useId();

  const addTag = () => {
    const tag = newTag.trim();
    if (tag === '') {
      return;
    }
    if (!tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setNewTag('');
  };

  return <div className="entry-tags-editor">
    {tags.map(tag => <span key={tag} className="badge bg-secondary entry-tag">
      {tag}
      <Button className="btn-close btn-close-white entry-tag-remove" aria-label={`Remove tag ${tag}`}
              onClick={() => onChange(tags.filter(t => t !== tag))}/>
    </span>)}
    <input type="text" list={listId} value={newTag} placeholder="Add tag" aria-label="New tag"
           onChange={(ev) => setNewTag(ev.target.value)}
           onKeyDown={(ev) => {
             if (ev.key === 'Enter') {
               ev.preventDefault();
               addTag();
             }
           }}/>
    <datalist id={listId}>
      {hints.filter(hint => !tags.includes(hint)).map(hint => <option key={hint} value={hint}/>)}
    </datalist>
    <Button variant="outline-secondary" size='sm' onClick={addTag}>Add</Button>
  </div>;
}
