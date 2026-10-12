import {ApparatusSubEntry as ApparatusSubEntryData} from "@/Edition/ApparatusSubEntry";
import FmtTextRenderer from "@/ReactAPM/Components/FmtTextRenderer";

interface SubEntryProps {
  subEntry: ApparatusSubEntryData;
  isFirst: boolean;
  sigla: string[];
}

export default function SubEntry({subEntry, isFirst, sigla}: SubEntryProps) {
  const keywords: Map<string, string> = new Map();
  keywords.set('empty', '');
  keywords.set('omission', 'om.');
  keywords.set('addition', 'add.');

  const subEntryClasses = ['sub-entry'];
  if (isFirst) {
    subEntryClasses.push('first');
  }
  if (!subEntry.enabled) {
    subEntryClasses.push('disabled');
  }
  const witnessDataText = subEntry.witnessData.map((wd) => sigla[wd.witnessIndex]).join('');
  return <span className={subEntryClasses.join(' ')}><i>{keywords.get(subEntry.type)}</i> <FmtTextRenderer
    t={subEntry.fmtText}/> {witnessDataText}</span>;
}