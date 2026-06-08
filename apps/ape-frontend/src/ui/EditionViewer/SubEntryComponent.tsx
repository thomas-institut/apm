import {ApparatusSubEntry} from "@shared/ts";
import {FmtTextSpan} from "@/ui/EditionViewer/FmtTextSpan";
import {fromCompactFmtText} from "@thomas-inst/fmt-text";

interface SubEntryComponentProps {
  subEntry: ApparatusSubEntry;
}

export function SubEntryComponent({subEntry} : SubEntryComponentProps) {
  switch (subEntry.type) {
    case 'empty':
      return null;

    case 'addition':
      return <div><em>add.</em> <FmtTextSpan fmtText={fromCompactFmtText(subEntry.text)}/></div>

    case 'omission':
      return <div><em>om.</em> <FmtTextSpan fmtText={fromCompactFmtText(subEntry.text)}/></div>
    default:
      return <div><FmtTextSpan fmtText={fromCompactFmtText(subEntry.text)}/></div>

  }
}
