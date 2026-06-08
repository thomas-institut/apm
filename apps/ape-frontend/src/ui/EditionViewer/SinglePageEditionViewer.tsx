import {EditionPublicationData, MainTextToken} from "@shared/ts";
import {fromCompactFmtText} from "@thomas-inst/fmt-text";
import {FmtTextSpan} from "@/ui/EditionViewer/FmtTextSpan";
import React, {useMemo} from "react";
import {SubEntryComponent} from "@/ui/EditionViewer/SubEntryComponent";


interface SinglePageEditionViewerProps {
  editionData: EditionPublicationData;
}



export function SinglePageEditionViewer({editionData}: SinglePageEditionViewerProps) {

  const specMap = useMemo(() => getMainTextTokenIndexToEntrySpecMap(editionData), [editionData]);

  const [highlightedToken, setHighlightedToken] = React.useState<number | null>(null);


  const renderParagraph = (paragraph: MainTextParagraph) => {

    const handleOnClick = (index: number) => {
      setHighlightedToken(index === highlightedToken ? null : index);
    }
    return (
      <p className={paragraph.style}>
        {paragraph.tokens.map((token, index) => {
          let className = `main-text-token main-text-token-${token.originalIndex} `
            + token.entries.map(entry => `entry-${entry.apparatus} entry-${entry.apparatus}-${entry.entryIndex}`).join(' ');

          if (token.originalIndex === highlightedToken) {
            className += ' highlighted-token';
          }
          return <span key={index} className={className} onClick={() =>handleOnClick(token.originalIndex)}><FmtTextSpan fmtText={fromCompactFmtText(token.text)}/></span>;
        })}
      </p>
    );
  };




  const renderEntries = (entrySpecs: EntrySpec[]|null) => {
    if (!entrySpecs) return null;
    return entrySpecs.map((entrySpec, index) => {
      const entryClass = `entry-${entrySpec.apparatus}`;
      const apparatus = editionData.apparatuses.find(apparatus => apparatus.type === entrySpec.apparatus);
      if (apparatus === undefined) {
        console.warn(`Apparatus with type ${entrySpec.apparatus} not found in edition data`);
        return null;
      }
      const entry = apparatus.entries[entrySpec.entryIndex];
      if (entry === undefined) {
        console.warn(`Entry with index ${entrySpec.entryIndex} not found in apparatus ${apparatus.type}`);
        return null;
      }
      return <div key={index} className={entryClass}>{<>
        <div className={'app-type'}>{apparatus.type}</div>
        <div className={'lemma-text'}>{entry.lemmaText}]</div>
        <div className={'sub-entries'}>{
          entry.subEntries.map( (subEntry, subEntryIndex) => <SubEntryComponent key={subEntryIndex} subEntry={subEntry}/>)}</div>
      </>
      }</div>;
    });
  }


  const langClass = ` text-${editionData.languageCode}`;
  return (
    <div className={langClass} style={{ display: 'grid', height: '100%', minHeight: 0, overflowY: 'hidden', gridTemplateColumns: '70% 30%', gap: '0.5rem'}}>
      <div style={{overflowY: "auto", height: "100%", boxSizing: 'border-box', minHeight: 0}} className={'edition-main-text'}>
        {getMainTextParagraphs(editionData.mainText, specMap).map((paragraph) => renderParagraph(paragraph))}
      </div>
      <div  className={'edition-main-text-entries'}>
        { highlightedToken !== null &&  renderEntries(specMap.get(highlightedToken) ?? null)}
      </div>
    </div>

  );
}

interface MainTextParagraph {
  style: string;
  tokens: DisplayMainTextToken[];
}

interface DisplayMainTextToken extends MainTextToken {
  originalIndex: number;
  entries: EntrySpec[];
}

interface EntrySpec {
  apparatus: string;
  entryIndex: number;
}

function getMainTextTokenIndexToEntrySpecMap(data: EditionPublicationData): Map<number, EntrySpec[]> {
  const map = new Map<number, EntrySpec[]>();
  data.mainText.forEach((_token, index) => {
    map.set(index, []);
  });

  data.apparatuses.forEach((app) => {
    app.entries.forEach((entry, entryIndex) => {
      const spec: EntrySpec = {apparatus: app.type, entryIndex};
      for (let i = entry.from; i <= entry.to; i++) {
        const tokenEntrySpecs = map.get(i);
        if (tokenEntrySpecs) {
          tokenEntrySpecs.push(spec);
        }
      }
    });
  });
  return map;
}


function getMainTextParagraphs(tokens: MainTextToken[], map: Map<number, EntrySpec[]>): MainTextParagraph[] {

  const paragraphs: MainTextParagraph[] = [];
  let currentParagraph: MainTextParagraph = {style: "", tokens: []};

  tokens.forEach((token, index) => {
    if (token.type === "paragraph_end") {
      paragraphs.push(currentParagraph);
      currentParagraph.style = token.style;
      currentParagraph = {style: "", tokens: []};
    } else {
      const displayToken: DisplayMainTextToken = {...token, originalIndex: index, entries: []};
      const specs = map.get(index);
      if (specs) {
        displayToken.entries = specs;
      }
      currentParagraph.tokens.push(displayToken);
    }
  });
  if (currentParagraph.tokens.length > 0) {
    paragraphs.push(currentParagraph);
  }
  return paragraphs;
}

