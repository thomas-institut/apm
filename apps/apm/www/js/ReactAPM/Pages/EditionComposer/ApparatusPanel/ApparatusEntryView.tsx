import {Fragment, memo, useState} from "react";
import {ApparatusEntry} from "@/Edition/ApparatusEntry";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import SubEntry from "@/ReactAPM/Pages/EditionComposer/SubEntry";
import {MainTextTokenRange} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/MainTextViewer";
import SubEntryQuickControls from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/SubEntryQuickControls";
import AddSubEntryButton from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/AddSubEntryButton";
import QuickSubEntryForm from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickSubEntryForm";
import {
  QuickEditOutcome,
  QuickEntryOperation
} from "@/ReactAPM/Pages/EditionComposer/ApparatusPanel/QuickEdit/QuickApparatusEditUtil";
import {getTextDirectionForLang} from "@/toolbox/Util";

export interface ApparatusEntryViewProps {
  entry: ApparatusEntry;
  entryIndex: number;
  isFirstInRange: boolean;
  isSelected: boolean;
  isHovered: boolean;
  sigla: string[];
  witnessOrder: number[];
  siglaGroups: SiglaGroup[];
  lang: string;
  /** If true, the quick-edit controls and the quick add form are available */
  canQuickEdit: boolean;
  onHoverRange: (range: MainTextTokenRange | null) => void;
  onClickLemma: (entryIndex: number, entry: ApparatusEntry) => void;
  onEditLemma?: (entryIndex: number) => void;
  onQuickEdit?: (entryIndex: number, operation: QuickEntryOperation) => Promise<QuickEditOutcome>;
}

/**
 * One apparatus entry: lemma and sub-entries, with the quick editing controls.
 * It is memoized: it only re-renders if the entry object or one of the flags change.
 */
function ApparatusEntryViewComponent({entry, entryIndex, isFirstInRange, isSelected, isHovered, sigla, witnessOrder,
                                       siglaGroups, lang, canQuickEdit, onHoverRange, onClickLemma, onEditLemma,
                                       onQuickEdit}: ApparatusEntryViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lemmaText = entry.mainTextWords.join(' ');
  const lemmaClasses = ['lemma'];
  if (isFirstInRange) {
    lemmaClasses.push('first');
  }
  if (isSelected) {
    lemmaClasses.push('selected');
  }
  if (isHovered) {
    lemmaClasses.push('main-text-hover');
  }
  const rtl = getTextDirectionForLang(lang) === 'rtl';
  const showControls = canQuickEdit && onQuickEdit !== undefined;
  const subEntriesClasses = ['sub-entries'];
  if (isSelected) {
    subEntriesClasses.push('selected-entry');
  }

  const runOperation = async (operation: QuickEntryOperation): Promise<boolean> => {
    if (onQuickEdit === undefined) {
      return false;
    }
    const outcome = await onQuickEdit(entryIndex, operation);
    if (outcome === true) {
      setError(null);
      return true;
    }
    setError(outcome);
    return false;
  };

  const lastIndex = entry.subEntries.length - 1;

  return <Fragment>
    <span className={lemmaClasses.join(' ')}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onClickLemma(entryIndex, entry);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onEditLemma?.(entryIndex);
          }}
          onMouseEnter={() => onHoverRange({from: entry.from, to: entry.to})}
          onMouseLeave={() => onHoverRange(null)}>{lemmaText + ']'}</span>
    <span className={subEntriesClasses.join(' ')}>{
      entry.subEntries.map((subEntry, index) => <span key={index} className="sub-entry-wrapper">
        <SubEntry subEntry={subEntry} subEntryIndex={index} sigla={sigla}/>
        {showControls && <SubEntryQuickControls enabled={subEntry.enabled} isFirst={index === 0}
                                                isLast={index === lastIndex} rtl={rtl}
                                                onToggle={() => runOperation({
                                                  kind: 'toggleSubEntry',
                                                  subEntryIndex: index
                                                })}
                                                onMove={(direction) => runOperation({
                                                  kind: 'moveSubEntry',
                                                  subEntryIndex: index,
                                                  direction
                                                })}/>}
        {showControls && index === lastIndex && !isAdding &&
          <AddSubEntryButton onClick={() => setIsAdding(true)}/>}
      </span>)
    }
      {showControls && entry.subEntries.length === 0 && !isAdding &&
        <AddSubEntryButton onClick={() => setIsAdding(true)}/>}
      {showControls && isAdding && <QuickSubEntryForm sigla={sigla} witnessOrder={witnessOrder}
                                                      siglaGroups={siglaGroups} targetEntry={entry} lang={lang}
                                                      onCancel={() => {
                                                        setIsAdding(false);
                                                        setError(null);
                                                      }}
                                                      onEnableExisting={async (subEntryIndex) => {
                                                        if (await runOperation({
                                                          kind: 'toggleSubEntry',
                                                          subEntryIndex
                                                        })) {
                                                          setIsAdding(false);
                                                        }
                                                      }}
                                                      onConfirm={async (subEntry) => {
                                                        if (await runOperation({kind: 'addSubEntry', subEntry})) {
                                                          setIsAdding(false);
                                                        }
                                                      }}/>}
      {error !== null && <span className="quick-edit-error text-danger">{error}</span>}
    </span>
  </Fragment>;
}

const ApparatusEntryView = memo(ApparatusEntryViewComponent);
export default ApparatusEntryView;
