import {FmtTextSpan} from "@/ui/EditionViewer/FmtTextSpan";
import {fromCompactFmtText} from "@thomas-inst/fmt-text";
import {EditionParametersByLanguage, FontStyle} from "@/ui/EditionViewer/EditionParameters";
import {ApparatusSubEntry, EditionWitnessInfo, WitnessData} from "@shared/ts";

interface SubEntryComponentProps {
  subEntry: ApparatusSubEntry;
  langCode: string;
  witnessInfo: EditionWitnessInfo[];
}

export function SubEntryComponent({subEntry, langCode, witnessInfo} : SubEntryComponentProps) {
  const editionParameters = EditionParametersByLanguage[langCode];

  const getFormattedString = (s: string, fontStyle: FontStyle, smallFontSize: number) => {
    switch (fontStyle) {
      case 'normal':
        return <>{s}</>
      case 'small':
        return <span style={{fontSize: `${smallFontSize}em`}}>{s}</span>
      case 'bold':
        return <b>{s}</b>;
      case 'italic':
        return <i>{s}</i>
    }
  }

  const getKeyword = (k: string) => {
    const keywordString = editionParameters.strings[k];
    const fontStyle = editionParameters.keywordFontStyle;
    const smallFontSize = editionParameters.smallFontFactor ?? 0.8;
    return getFormattedString(keywordString, fontStyle, smallFontSize)
  }

  const getSigla = (witnessData: WitnessData[], witnessInfo: EditionWitnessInfo[])=> {
    const siglaString = witnessData.map( w => w.witnessIndex).map( index => witnessInfo[index].siglum).join(' ')
    const fontStyle = editionParameters.siglaFontStyle;
    const smallFontSize = editionParameters.smallFontFactor ?? 0.8;
    return getFormattedString(siglaString, fontStyle, smallFontSize)
  }

  switch (subEntry.type) {
    case 'empty':
      return null;

    case 'addition':
    case 'omission':
      return <span className={'sub-entry'}>{getKeyword(subEntry.type)} <FmtTextSpan fmtText={fromCompactFmtText(subEntry.text)}/> {getSigla(subEntry.witnessData, witnessInfo)}</span>

    default:
      return <span className={'sub-entry'}><FmtTextSpan fmtText={fromCompactFmtText(subEntry.text)}/>  {getSigla(subEntry.witnessData, witnessInfo)}</span>

  }
}
