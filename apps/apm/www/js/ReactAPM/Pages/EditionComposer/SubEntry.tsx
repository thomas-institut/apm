import {ApparatusSubEntry as ApparatusSubEntryData} from "@/Edition/ApparatusSubEntry";
import FmtTextRenderer from "@/ReactAPM/Components/FmtTextRenderer";

interface SubEntryProps {
  subEntry: ApparatusSubEntryData;
  subEntryIndex: number;
  sigla: string[];
}

export default function SubEntry({subEntry, subEntryIndex, sigla}: SubEntryProps) {
  const keywords: Map<string, string> = new Map();
  keywords.set('empty', '');
  keywords.set('omission', 'om.');
  keywords.set('addition', 'add.');

  const keywordKey = subEntry.type === 'fullCustom' ? subEntry.keyword : subEntry.type;
  const subEntryClasses = ['sub-entry', `sub-entry-${subEntryIndex}`, `sub-entry-type-${subEntry.type}`, `sub-entry-source-${subEntry.source}`];
  if (!subEntry.enabled) {
    subEntryClasses.push('sub-entry-disabled');
  }
  const witnessDataText = subEntry.witnessData.map((wd) => sigla[wd.witnessIndex]).join('');
  return <span className={subEntryClasses.join(' ')}><i>{keywords.get(keywordKey)}</i> <FmtTextRenderer
    t={subEntry.fmtText}/> {witnessDataText}</span>;
}