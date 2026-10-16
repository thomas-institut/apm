import {useState} from "react";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import {LemmaType} from "@/Edition/EditionInterface";
import {ApparatusCommon} from "@/EditionComposer/ApparatusCommon";
import {varsAreEqual} from "@/lib/ToolBox/ArrayUtil";
import {CtRange} from "@/Edition/ApparatusEntryCustomization";
import LemmaGroupField, {
  LemmaGroupFieldOption
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/LemmaGroupField";
import EntryTagsEditor from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/EntryTagsEditor";
import SubEntryEditorRow from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/SubEntryEditorRow";
import {
  addCustomSubEntry,
  deleteSubEntry,
  getLemmaGroupToggleOption,
  getLemmaGroupValue,
  getPlainLemmaGroupText,
  LemmaGroupVariable,
  moveSubEntry,
  setLemmaGroupVariable,
  setLemmaType,
  setSubEntryEnabled,
  setSubEntryFmtText,
  setSubEntryKeyword,
  setSubEntryWitnessData,
  setTags
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/ApparatusEntryEditorUtil";
import './ApparatusEntryEditor.css';

interface ApparatusEntryEditorProps {
  entry: ApparatusEntry;
  ctRange: CtRange;
  lang: string;
  sigla: string[];
  siglaGroups: SiglaGroup[];
  /** Called with the edited entry when the user clicks on 'Update Apparatus'. */
  onUpdate: (editedEntry: ApparatusEntry) => void | Promise<void>;
  onCancel: () => void;
}

interface ToggleState {
  option: string;
  text: string;
}

interface EditorState {
  entry: ApparatusEntry;
  /** Stable keys for the sub-entry rows, so that row state follows the sub-entry when moving */
  rowKeys: number[];
  nextRowKey: number;
  /** Key of a row that was just added and should open with its editor visible */
  newRowKey: number | null;
  lemma: ToggleState;
  preLemma: ToggleState;
  postLemma: ToggleState;
  separator: ToggleState;
}

const groupVariableOptionNames: Record<LemmaGroupVariable, string[]> = {
  preLemma: ['auto', 'ante', 'post', 'custom'],
  postLemma: ['auto', 'custom'],
  separator: ['auto', 'off', 'colon', 'custom']
};

function getGroupToggleState(entry: ApparatusEntry, variable: LemmaGroupVariable): ToggleState {
  const option = getLemmaGroupToggleOption(entry[variable], groupVariableOptionNames[variable]);
  return {option, text: option === 'custom' ? getPlainLemmaGroupText(entry[variable]) : ''};
}

function getInitialState(entry: ApparatusEntry): EditorState {
  return {
    entry,
    rowKeys: entry.subEntries.map((_s, i) => i),
    nextRowKey: entry.subEntries.length,
    newRowKey: null,
    lemma: {
      option: entry.lemmaType,
      text: entry.lemmaType === 'custom' ? entry.customLemmaText ?? '' : ''
    },
    preLemma: getGroupToggleState(entry, 'preLemma'),
    postLemma: getGroupToggleState(entry, 'postLemma'),
    separator: getGroupToggleState(entry, 'separator')
  };
}

function getCtColumnsText(ctRange: CtRange): string {
  return ctRange.from === ctRange.to ? `${ctRange.from + 1}` : `${ctRange.from + 1}\u2013${ctRange.to + 1}`;
}

/**
 * The full apparatus entry editor: lemma group, tags and sub-entries.
 *
 * Changes are made on a working copy of the entry and only committed when the user
 * clicks on the 'Update Apparatus' button.
 */
export default function ApparatusEntryEditor({
                                               entry, ctRange, lang, sigla, siglaGroups, onUpdate, onCancel
                                             }: ApparatusEntryEditorProps) {
  const [originalEntry] = useState(() => ApparatusEntry.clone(entry));
  const [state, setState] = useState<EditorState>(() => getInitialState(ApparatusEntry.clone(entry)));
  const [updating, setUpdating] = useState(false);

  const edited = state.entry;
  const hasChanges = !varsAreEqual(originalEntry, edited);

  const updateEntry = (change: (entry: ApparatusEntry) => ApparatusEntry) => {
    setState(previous => ({...previous, entry: change(previous.entry)}));
  };

  const keywordLabel = (keyword: string) => <i>{ApparatusCommon.getKeywordString(keyword, lang)}</i>;

  const groupFieldProps = (variable: LemmaGroupVariable) => ({
    selected: state[variable].option,
    customText: state[variable].text,
    onChange: (option: string, text: string) => {
      setState(previous => ({
        ...previous,
        entry: setLemmaGroupVariable(previous.entry, variable, getLemmaGroupValue(option, text)),
        [variable]: {option, text: option === 'custom' ? text : ''}
      }));
    }
  });

  const preLemmaOptions: LemmaGroupFieldOption[] = [
    {key: 'auto', label: 'Auto', title: 'Let APM generate pre-lemma text'},
    {key: 'ante', label: keywordLabel('ante'), title: `Standard keyword '${ApparatusCommon.getKeywordString('ante', lang)}'`},
    {key: 'post', label: keywordLabel('post'), title: `Standard keyword '${ApparatusCommon.getKeywordString('post', lang)}'`},
    {key: 'custom', label: 'Custom', title: 'Enter custom pre-lemma text'}
  ];
  const lemmaOptions: LemmaGroupFieldOption[] = [
    {key: 'auto', label: 'Auto', title: 'Let APM generate lemma'},
    {key: 'dash', label: <i>dash</i>, title: 'Force dash (\u2014) between first and last words'},
    {key: 'ellipsis', label: <i>ellipsis</i>, title: 'Force ellipsis (...) between first and last words'},
    {key: 'custom', label: 'Custom', title: 'Enter custom lemma text'}
  ];
  const postLemmaOptions: LemmaGroupFieldOption[] = [
    {key: 'auto', label: 'Auto', title: 'Let APM generate post lemma text'},
    {key: 'custom', label: 'Custom', title: 'Enter custom post lemma text'}
  ];
  const separatorOptions: LemmaGroupFieldOption[] = [
    {key: 'auto', label: 'Auto', title: 'Let APM generate separator'},
    {key: 'off', label: 'Off', title: 'Turn off separator'},
    {key: 'colon', label: ':', title: "Colon ':'"},
    {key: 'custom', label: 'Custom', title: 'Enter custom separator'}
  ];

  const handleUpdate = async () => {
    if (!hasChanges || updating) {
      return;
    }
    setUpdating(true);
    try {
      await onUpdate(edited);
    } finally {
      setUpdating(false);
    }
  };

  const addSubEntry = () => {
    setState(previous => ({
      ...previous,
      entry: addCustomSubEntry(previous.entry),
      rowKeys: [...previous.rowKeys, previous.nextRowKey],
      newRowKey: previous.nextRowKey,
      nextRowKey: previous.nextRowKey + 1
    }));
  };

  const move = (index: number, direction: 'up' | 'down') => {
    setState(previous => {
      const target = index + (direction === 'up' ? -1 : 1);
      if (target < 0 || target >= previous.rowKeys.length) {
        return previous;
      }
      const rowKeys = [...previous.rowKeys];
      [rowKeys[index], rowKeys[target]] = [rowKeys[target], rowKeys[index]];
      return {...previous, entry: moveSubEntry(previous.entry, index, direction), rowKeys};
    });
  };

  const remove = (index: number) => {
    setState(previous => ({
      ...previous,
      entry: deleteSubEntry(previous.entry, index),
      rowKeys: previous.rowKeys.filter((_k, i) => i !== index)
    }));
  };

  return <div className={`aei-form apparatus-entry-editor text-${lang}`}>
    <div className="form-header">
      <h5 className="form-title">Apparatus Entry</h5>
    </div>
    <div className="form-body">
      <div className="aei-field-row">
        <div className="aei-field-label">Edition Text:</div>
        <div className={`aei-field-content entry-text text-${lang}`}>{edited.mainTextWords.join(' ')}</div>
      </div>
      <div className="aei-field-row">
        <div className="aei-field-label">Collation Table:</div>
        <div className="aei-field-content ct-table-cols">{getCtColumnsText(ctRange)}</div>
      </div>
      <div className="aei-field-row">
        <div className="aei-field-label">Tags:</div>
        <div className="aei-field-content">
          <EntryTagsEditor tags={edited.tags} onChange={(tags) => updateEntry(e => setTags(e, tags))}/>
        </div>
      </div>
      <LemmaGroupField label="Pre Lemma:" options={preLemmaOptions} {...groupFieldProps('preLemma')}/>
      <LemmaGroupField label="Lemma:" options={lemmaOptions}
                       selected={state.lemma.option} customText={state.lemma.text}
                       onChange={(option, text) => {
                         setState(previous => ({
                           ...previous,
                           entry: setLemmaType(previous.entry, option as LemmaType, text),
                           lemma: {option, text: option === 'custom' ? text : ''}
                         }));
                       }}/>
      <LemmaGroupField label="Post Lemma:" options={postLemmaOptions} {...groupFieldProps('postLemma')}/>
      <LemmaGroupField label="Separator:" options={separatorOptions} customTextSize={3}
                       {...groupFieldProps('separator')}/>
      <div className="sub-entries">
        {edited.subEntries.length === 0 && <em>No sub-entries</em>}
        {edited.subEntries.map((subEntry, index) => {
          const rowKey = state.rowKeys[index];
          return <SubEntryEditorRow
            key={rowKey}
            subEntry={subEntry}
            index={index}
            numSubEntries={edited.subEntries.length}
            lang={lang}
            sigla={sigla}
            siglaGroups={siglaGroups}
            initiallyEditing={rowKey === state.newRowKey}
            onEnabledChange={(enabled) => updateEntry(e => setSubEntryEnabled(e, index, enabled))}
            onMove={(direction) => move(index, direction)}
            onDelete={() => remove(index)}
            onKeywordChange={(keyword) => updateEntry(e => setSubEntryKeyword(e, index, keyword))}
            onFmtTextChange={(fmtText) => updateEntry(e => setSubEntryFmtText(e, index, fmtText))}
            onWitnessDataChange={(witnessData) => updateEntry(e => setSubEntryWitnessData(e, index, witnessData))}/>;
        })}
        <button type="button" className="btn btn-sm add-custom-sub-entry-btn" onClick={addSubEntry}>Add Custom</button>
      </div>
    </div>
    <div className="form-footer">
      {hasChanges && <button type="button" className="btn btn-sm btn-danger update-btn" disabled={updating}
                             onClick={handleUpdate}>Update Apparatus</button>}
      <button type="button" className="btn btn-sm btn-primary cancel-btn" disabled={updating}
              onClick={onCancel}>Cancel</button>
      {updating && <span className="info-div">Updating edition...</span>}
    </div>
  </div>;
}
