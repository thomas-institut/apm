import {EditionPublicationData, MainTextToken} from "@shared/ts";
import React, {useCallback, useMemo} from "react";
import {SubEntryComponent} from "@/ui/EditionViewer/SubEntryComponent";
import "./SinglePageEditionViewer.css";
import {titleCase} from "@/Utilities/StringUtilities";
import {
  DisplayMainTextToken,
  EditionParagraph,
  EntrySpec,
  MainTextParagraph
} from "@/ui/EditionViewer/EditionParagraph";


interface SinglePageEditionViewerProps {
  editionData: EditionPublicationData;
}


export function SinglePageEditionViewer({editionData}: SinglePageEditionViewerProps) {

  const specMap = useMemo(() => getMainTextTokenIndexToEntrySpecMap(editionData), [editionData]);

  const [highlightedToken, setHighlightedToken] = React.useState<number | null>(null);

  const handleTokenClick = useCallback((index: number) => {
    setHighlightedToken(current => index === current ? null : index);
  }, []);


  const renderEntries = (entrySpecs: EntrySpec[] | null) => {
    if (!entrySpecs) return null;
    return entrySpecs.map((entrySpec, index) => {
      const apparatusClass = `apparatus-div apparatus-${entrySpec.apparatus}`;
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
      return <div key={index} className={apparatusClass}>{<>
        <div className={'apparatus-type'}>{titleCase(apparatus.type)}</div>
        <div className={'apparatus-entry'}>
          <span className={'lemma-text'}>{entry.lemmaText}</span>]
          {entry.subEntries.map((subEntry, subEntryIndex) => <SubEntryComponent key={subEntryIndex} subEntry={subEntry}
                                                                                langCode={editionData.languageCode}
                                                                                witnessInfo={editionData.witnesses}/>)}
        </div>
      </>
      }</div>;
    });
  };

  const {paragraphs, tokenToParagraphMap} = useMemo(
    () => getMainTextParagraphs(editionData.mainText, specMap),
    [editionData.mainText, specMap]
  );

  const highlightedParagraphIndex = useMemo(() => {
    return highlightedToken !== null ? tokenToParagraphMap.get(highlightedToken) ?? null : null;
  }, [highlightedToken, tokenToParagraphMap]);


  const langClass = ` text-${editionData.languageCode}`;
  return (
    <div className={langClass + ' ev-single-page'}>
      <div className={'main-text-panel'}>
        {paragraphs.map((paragraph, index) => (
          <EditionParagraph
            key={index}
            paragraph={paragraph}
            highlightedToken={index === highlightedParagraphIndex ? highlightedToken : null}
            onTokenClick={handleTokenClick}
          />
        ))}
      </div>
      <div className={'app-panel'}>
        {highlightedToken !== null && renderEntries(specMap.get(highlightedToken) ?? null)}
      </div>
    </div>

  );
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


function getMainTextParagraphs(tokens: MainTextToken[], map: Map<number, EntrySpec[]>): {
  paragraphs: MainTextParagraph[],
  tokenToParagraphMap: Map<number, number>
} {

  const paragraphs: MainTextParagraph[] = [];
  const tokenToParagraphMap = new Map<number, number>();
  let currentParagraph: MainTextParagraph = {style: "", tokens: []};

  tokens.forEach((token, index) => {
    if (token.type === "paragraph_end") {
      currentParagraph.style = token.style;
      paragraphs.push(currentParagraph);
      currentParagraph = {style: "", tokens: []};
    } else {
      const displayToken: DisplayMainTextToken = {...token, originalIndex: index, entries: []};
      const specs = map.get(index);
      if (specs) {
        displayToken.entries = specs;
      }
      tokenToParagraphMap.set(index, paragraphs.length);
      currentParagraph.tokens.push(displayToken);
    }
  });
  if (currentParagraph.tokens.length > 0) {
    paragraphs.push(currentParagraph);
  }
  return {paragraphs, tokenToParagraphMap};
}

