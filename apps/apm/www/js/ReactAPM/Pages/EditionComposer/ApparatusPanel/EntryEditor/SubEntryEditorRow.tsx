import {useState} from "react";
import {ArrowDown, ArrowUp, Pencil, Trash} from "react-bootstrap-icons";
import {FmtText} from "@thomas-inst/fmt-text";
import {ApparatusSubEntry} from "@/Edition/ApparatusSubEntry";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import {WitnessDataItem} from "@/Edition/WitnessDataItem";
import * as SubEntryType from "@/Edition/SubEntryType";
import {ApparatusCommon} from "@/EditionComposer/ApparatusCommon";
import {trimWhiteSpace} from "@/toolbox/Util";
import MultiToggle from "@/ReactAPM/Components/MultiToggle/MultiToggle";
import ConfirmDialog from "@/ReactAPM/Components/ConfirmDialog";
import FmtTextQuillEditor from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/FmtTextQuillEditor";
import WitnessDataSelector from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/EntryEditor/WitnessDataSelector";

interface SubEntryEditorRowProps {
  subEntry: ApparatusSubEntry;
  index: number;
  numSubEntries: number;
  lang: string;
  sigla: string[];
  siglaGroups: SiglaGroup[];
  initiallyEditing?: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onMove: (direction: 'up' | 'down') => void;
  onDelete: () => void;
  onKeywordChange: (keyword: string) => void;
  onFmtTextChange: (fmtText: FmtText) => void;
  onWitnessDataChange: (witnessData: WitnessDataItem[]) => void;
}

function getTypeLabel(subEntry: ApparatusSubEntry): string {
  const sourceLabel = subEntry.source === 'auto' ? 'AUTO' : 'CUSTOM';
  let typeLabel: string;
  switch (subEntry.type) {
    case SubEntryType.ADDITION:
      typeLabel = 'ADDITION';
      break;
    case SubEntryType.OMISSION:
      typeLabel = 'OMISSION';
      break;
    case SubEntryType.VARIANT:
      typeLabel = 'VARIANT';
      break;
    case SubEntryType.FULL_CUSTOM:
      typeLabel = '';
      break;
    case SubEntryType.AUTO_FOLIATION:
      typeLabel = 'FOLIATION';
      break;
    default:
      typeLabel = 'UNKNOWN';
  }
  return [sourceLabel, typeLabel].join(' ').trim();
}

export default function SubEntryEditorRow({
                                            subEntry, index, numSubEntries, lang, sigla, siglaGroups, initiallyEditing = false,
                                            onEnabledChange, onMove, onDelete, onKeywordChange, onFmtTextChange,
                                            onWitnessDataChange
                                          }: SubEntryEditorRowProps) {
  const [editorVisible, setEditorVisible] = useState(initiallyEditing);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isCustom = subEntry.source === 'user';

  let previewHtml = trimWhiteSpace(ApparatusCommon.genSubEntryHtmlContent(lang, subEntry, sigla, siglaGroups, true));
  if (previewHtml === '') {
    previewHtml = '<span class="empty-sub-entry">--empty--</span>';
  }

  const omissionLabel = ApparatusCommon.getKeywordString('omission', lang);
  const additionLabel = ApparatusCommon.getKeywordString('addition', lang);
  const checkboxId = `aei-sub-entry-${index}-enabled`;

  return <div className="sub-entry-editor-row">
    <div className="sub-entry-editor-main">
      <span className="order-buttons">
        <button type="button" className="btn btn-sm move-up-btn" title="Move up" aria-label="Move up"
                disabled={index === 0} onClick={() => onMove('up')}><ArrowUp/></button>
        <button type="button" className="btn btn-sm move-down-btn" title="Move down" aria-label="Move down"
                disabled={index === numSubEntries - 1} onClick={() => onMove('down')}><ArrowDown/></button>
      </span>
      <span className="sub-entry-type-label">{getTypeLabel(subEntry)}</span>
      <span className="form-check sub-entry-enabled-check">
        <input id={checkboxId} className="form-check-input sub-entry-enabled-checkbox" type="checkbox"
               checked={subEntry.enabled} aria-label="Enabled"
               onChange={(ev) => onEnabledChange(ev.target.checked)}/>
        <label htmlFor={checkboxId} className={`form-check-label apparatus text-${lang} sub-entry-preview`}
               dangerouslySetInnerHTML={{__html: previewHtml}}/>
      </span>
      {isCustom && <span className="sub-entry-buttons">
        <button type="button" className="btn btn-sm sub-entry-edit-btn" title="Show/Hide Editor"
                aria-label="Show/Hide Editor"
                onClick={() => setEditorVisible(visible => !visible)}><Pencil/></button>
        <button type="button" className="btn btn-sm sub-entry-delete-btn" title="Delete" aria-label="Delete"
                onClick={() => setShowDeleteConfirm(true)}><Trash/></button>
      </span>}
    </div>
    {isCustom && subEntry.type === SubEntryType.FULL_CUSTOM && editorVisible && <div className="sub-entry-edit-div">
      <MultiToggle
        className="sub-entry-keyword-toggle"
        options={[
          {key: 'none', label: <span title="No keyword">&empty;</span>},
          {key: 'omission', label: <span title="Omission">{omissionLabel}</span>},
          {key: 'addition', label: <span title="Addition">{additionLabel}</span>}
        ]}
        selected={subEntry.keyword === '' ? 'none' : subEntry.keyword}
        onChange={(option) => onKeywordChange(option === 'none' ? '' : option)}/>
      <FmtTextQuillEditor lang={lang} initialText={subEntry.fmtText} onChange={onFmtTextChange}/>
      <WitnessDataSelector sigla={sigla} lang={lang} witnessData={subEntry.witnessData}
                           onChange={onWitnessDataChange}/>
    </div>}
    <ConfirmDialog show={showDeleteConfirm} size="sm" title="Delete custom entry"
                   onHide={() => setShowDeleteConfirm(false)}
                   onAccept={onDelete}
                   acceptButtonLabel="Delete" cancelButtonLabel="Cancel"
                   body={<>
                     <p>Are you sure you want to delete this custom entry?</p>
                     <p className={`apparatus text-${lang} sub-entry-delete-preview`}
                        dangerouslySetInnerHTML={{__html: previewHtml}}/>
                     <p>You can just disable it in case you change your mind about displaying it in the apparatus</p>
                   </>}/>
  </div>;
}
