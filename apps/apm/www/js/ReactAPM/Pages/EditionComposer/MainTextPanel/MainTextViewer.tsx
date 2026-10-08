import {MainText} from "@/Edition/MainText";
import {MainTextToken} from "@/Edition/MainTextToken";
import {MainTextParagraph} from "@/Edition/MainTextParagraph";
import * as EditionMainTextTokenType from "@/Edition/MainTextTokenType";
import FmtTextRenderer from "@/ReactAPM/Components/FmtTextRenderer";
import {
  EditionWitnessIndexToCtIndexMap
} from "@/ReactAPM/Pages/EditionComposer/MainTextPanel/EditionWitnessIndexToCtIndexMap";


interface MainTextViewerProps {
  mainText: MainTextToken[],
  indexMap: EditionWitnessIndexToCtIndexMap,
  className?: string
}

const MTT = 'mtt';
const MTT_ORIG = 'mtt-';
const CTI = 'cti-';
const WS = 'whitespace';
const NL = 'numbering-label';

export default function MainTextViewer({mainText, indexMap, className = ''}: MainTextViewerProps) {
  let paragraphs = MainText.getParagraphs(mainText);

  const getParagraph = (paragraph: MainTextParagraph, parIndex: number) => {
    return paragraph.tokens.map((token, tokenIndex) => {
      const key = [parIndex, tokenIndex].join('-');
      switch (token.type) {
        case EditionMainTextTokenType.GLUE:
          const glueClasses = [MTT, `${MTT_ORIG}${token.originalIndex}`, WS];
          return <span className={glueClasses.join(' ')} key={key}> </span>

        case EditionMainTextTokenType.TEXT:
        case EditionMainTextTokenType.NUMBERING_LABEL:
        case EditionMainTextTokenType.FOLIATION_CHANGE_MARKER:
          const ctIndex = indexMap[token.editionWitnessTokenIndex];
          const typeClass = token.type === EditionMainTextTokenType.TEXT ? [] : [NL];
           const tokenClasses = [MTT, `${MTT_ORIG}${token.originalIndex}`, `${CTI}${ctIndex}`, ...typeClass];
          return <span className={tokenClasses.join(' ')} key={key}><FmtTextRenderer t={token.fmtText} index={tokenIndex}/></span>

        default:
          return null;
      }
    });
  }
  return <div className={className}>
    {paragraphs.map((paragraph, index) => {
      return <p className={paragraph.type} key={index}>{getParagraph(paragraph, index)}</p>;
    })}
  </div>

}