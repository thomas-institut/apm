import {Fragment, ReactNode} from "react";
import {ApparatusSubEntry as ApparatusSubEntryData} from "@/Edition/ApparatusSubEntry";
import {SiglaGroup} from "@/Edition/SiglaGroup";
import {WitnessDataItemInterface} from "@/CtData/CtDataInterface";
import * as SubEntryType from "@/Edition/SubEntryType";
import {ApparatusUtil} from "@/Edition/ApparatusUtil";
import {ApparatusCommon} from "@/EditionComposer/ApparatusCommon";
import FmtTextRenderer from "@/ReactAPM/Components/FmtTextRenderer";

interface SubEntryProps {
  subEntry: ApparatusSubEntryData;
  subEntryIndex: number;
  sigla: string[];
  /** Language of the apparatus: 'la', 'ar' or 'he'. Defaults to 'la' */
  lang?: string;
  siglaGroups?: SiglaGroup[];
  /** If true, when sigla groups are used the full sigla are shown in brackets instead of in a tooltip */
  fullSiglaInBrackets?: boolean;
}

const NO_SIGLA_GROUPS: SiglaGroup[] = [];

const needsHand = (w: WitnessDataItemInterface): boolean => !(w.hand === 0 && !w.forceHandDisplay);

function getSiglaNodes(witnessData: WitnessDataItemInterface[], lang: string): ReactNode[] {
  return witnessData.map((w, i) => {
    if (!needsHand(w)) {
      return <Fragment key={i}>{lang === 'ar' ? `${w.siglum}\u200B` : w.siglum}</Fragment>;
    }
    return <Fragment key={i}>{w.siglum}<sup>{ApparatusCommon.getNumberString(w.hand + 1, lang)}</sup></Fragment>;
  });
}

function getSiglaPlainText(witnessData: WitnessDataItemInterface[], lang: string): string {
  return witnessData.map(w => needsHand(w) ? `${w.siglum}${ApparatusCommon.getNumberString(w.hand + 1, lang)}` : w.siglum).join('');
}

function getSiglaContent(subEntry: ApparatusSubEntryData, sigla: string[], lang: string, siglaGroups: SiglaGroup[],
                         fullSiglaInBrackets: boolean): ReactNode[] {
  if (subEntry.witnessData.length === 0) {
    return [];
  }
  const full = ApparatusUtil.getSiglaData(subEntry.witnessData, sigla, []);
  const matched = ApparatusUtil.getSiglaData(subEntry.witnessData, sigla, siglaGroups);
  const matchedNodes = getSiglaNodes(matched, lang);
  const fullText = getSiglaPlainText(full, lang);
  if (getSiglaPlainText(matched, lang) === fullText) {
    return matchedNodes;
  }
  if (fullSiglaInBrackets) {
    return [...matchedNodes, ` ( = ${fullText})`];
  }
  return [<a key="group" title={`= ${fullText}`}>{matchedNodes}</a>];
}

function Keyword({keyword, lang}: { keyword: string, lang: string }) {
  const text = ApparatusCommon.getKeywordString(keyword, lang);
  return lang === 'ar' || lang === 'he' ? <small>{text}</small> : <i>{text}</i>;
}

export default function SubEntry({
                                   subEntry, subEntryIndex, sigla, lang = 'la', siglaGroups = NO_SIGLA_GROUPS,
                                   fullSiglaInBrackets = false
                                 }: SubEntryProps) {
  const subEntryClasses = ['sub-entry', `sub-entry-${subEntryIndex}`, `sub-entry-type-${subEntry.type}`, `sub-entry-source-${subEntry.source}`];
  if (!subEntry.enabled) {
    subEntryClasses.push('sub-entry-disabled');
  }

  const isRtl = lang === 'ar' || lang === 'he';
  const textDirection = isRtl ? 'rtl' : 'ltr';
  const text = <FmtTextRenderer t={subEntry.fmtText}/>;
  const siglaNodes = getSiglaContent(subEntry, sigla, lang, siglaGroups, fullSiglaInBrackets);
  const hasSigla = siglaNodes.length > 0;
  const boldSigla = <b>{siglaNodes}</b>;
  const forcedSpace = <span className={`force-${textDirection}`}>{'\u00A0'}</span>;

  let content: ReactNode;
  switch (subEntry.type) {
    case SubEntryType.VARIANT:
      content = lang === 'he' ? <>{text}{forcedSpace}{boldSigla}</> : <>{text} {siglaNodes}</>;
      break;

    case SubEntryType.OMISSION:
      content = lang === 'he' ? <><Keyword keyword="omission" lang={lang}/>{forcedSpace}{boldSigla}</> :
        <><Keyword keyword="omission" lang={lang}/> {siglaNodes}</>;
      break;

    case SubEntryType.ADDITION:
      content = lang === 'he' ? <><Keyword keyword="addition" lang={lang}/> {text}{forcedSpace}{boldSigla}</> :
        <><Keyword keyword="addition" lang={lang}/> {text} {siglaNodes}</>;
      break;

    case SubEntryType.FULL_CUSTOM: {
      const keyword = subEntry.keyword === 'omission' || subEntry.keyword === 'addition' ?
        <><Keyword keyword={subEntry.keyword} lang={lang}/>{' '}</> : null;
      let siglaPart: ReactNode;
      if (isRtl) {
        siglaPart = hasSigla ? <>{forcedSpace}<span className="force-rtl">{lang === 'he' ? boldSigla : siglaNodes}</span></> : null;
      } else {
        siglaPart = <> {siglaNodes}</>;
      }
      content = <>{keyword}{text}{siglaPart}</>;
      break;
    }

    case SubEntryType.AUTO_FOLIATION:
      content = isRtl ? <>{text}{forcedSpace}{boldSigla}</> : <>{text}{boldSigla}</>;
      break;

    default:
      console.warn(`Unsupported apparatus entry type: ${subEntry.type}`);
      content = '???';
  }

  return <span className={subEntryClasses.join(' ')}>{content}</span>;
}
