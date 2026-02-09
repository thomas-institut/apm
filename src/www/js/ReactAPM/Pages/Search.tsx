import React, { useEffect, useContext, useRef, useState } from 'react';
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import { AppContext } from "@/ReactAPM/App";
import { LanguageDetector } from '@/toolbox/LanguageDetector';
import { urlGen } from '@/pages/common/SiteUrlGen';
import { tr } from '@/pages/common/SiteLang';

const STATE_INIT = 0;
const STATE_WAITING_FOR_SERVER = 1;

export default function SearchPage() {
  // const appContext = useContext(AppContext);

  const [corpus, setCorpus] = useState('transcriptions');
  const [keywords, setKeywords] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [creatorInput, setCreatorInput] = useState('');
  const [distance, setDistance] = useState(10);
  const [lemmatize, setLemmatize] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [titleList, setTitleList] = useState<string[]>([]);
  const [creatorList, setCreatorList] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [searchStatus, setSearchStatus] = useState(STATE_INIT);
  const [isIdle, setIsIdle] = useState(true);
  const [globalContext, setGlobalContext] = useState(11);

  const isInvalidSearch = keywords.includes('*') && lemmatize;

  const storedData = useRef({
    data_for_context: [] as any[],
    context: [] as any[],
    numDisplayedPassages: 0,
    prevTitle: ''
  });

  // add some css classes
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes slowFadeIn {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .fade-in-element {
        animation: slowFadeIn 0.8s ease-out forwards;
      }
      
.knob-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #fff;
  border-radius: 50%;
  border: 1.5px solid #333;
  cursor: ns-resize;
}

.knob-value-center {
  /* Font size is handled dynamically */
  font-weight: bold;
  z-index: 2;
  pointer-events: none;
}
.knob-mini-pointer {
  position: absolute;
  width: 3px;
  height: 3px;
  background: #333;
  left: 50%;
  top: 3px;           /* Offset further inwards */
  border-radius: 50%;
  z-index: 3;
}
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // track keyword distance
  useEffect(() => {
    const min = getMinDistance(keywords);
    if (distance < min) {
      setDistance(min);
      setErrorMessage(''); // Clear message as we corrected it automatically
    }
  }, [keywords, distance]);

// global press-enter listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // We look for the button only if it is NOT disabled
        const searchBtn = document.querySelector('#search-submit-button:not([disabled])') as HTMLButtonElement;

        if (searchBtn) {
          e.preventDefault();
          searchBtn.click(); // This triggers handleSearchTrigger with the freshest state
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isInvalidSearch, searchStatus, keywords]);

  // adjust page to corpus selection
  useEffect(() => {
    document.title = tr('Search');
    fetchCreatorsAndTitles(corpus);
    fetchCreatorsAndTitles(corpus === 'transcriptions' ? 'transcribers' : 'editors');
  }, [corpus]);

  // create knob
  const GlobalContextKnob = ({ value, onChange, showValueInside = false, max = 99 }: { value: number, onChange: (val: number) => void, showValueInside?: boolean, max?: number }) => {
    const [isDragging, setIsDragging] = useState(false);
    const valueRef = useRef(value);
    useEffect(() => { valueRef.current = value; }, [value]);

    // Keyword Distance Knob is slightly smaller (26px), Context Knobs stay at 20px
    const size = showValueInside ? '26px' : '20px';
    const fontSize = showValueInside ? '11px' : '9px';

    // Rotation origin for the pointer (only relevant for Context Knobs)
    const pointerOrigin = '7px'; // 10px Radius - 2px Top

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      const startY = e.clientY;
      const startVal = valueRef.current;
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 4;
        const delta = Math.floor((startY - moveEvent.clientY) / sensitivity);
        const newVal = Math.max(0, Math.min(max, startVal + delta));
        if (newVal !== valueRef.current) onChange(newVal);
      };
      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
      };
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      e.preventDefault();
    };

    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -2 : 2;
      onChange(Math.max(0, Math.min(max, value + delta)));
    };

    const rotation = (value / max) * 280 - 140;

    return (
        <div
            className="knob-mini"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            style={{
              userSelect: 'none',
              touchAction: 'none',
              width: size,
              height: size,
              border: isDragging ? '1.5px solid #007bff' : '1.5px solid #333'
            }}
        >
          {/* Only show pointer if NO number is inside */}
          {!showValueInside && (
              <div
                  className="knob-mini-pointer"
                  style={{
                    transform: `translateX(-50%) rotate(${rotation}deg)`,
                    background: isDragging ? '#007bff' : '#333',
                    transformOrigin: `50% ${pointerOrigin}`
                  }}
              />
          )}

          {showValueInside && (
              <span
                  className="knob-value-center"
                  style={{
                    color: isDragging ? '#007bff' : '#333',
                    fontSize: fontSize
                  }}
              >
          {value}
        </span>
          )}
        </div>
    );
  };

  // function to fetch creators and titles for the selector lists
  const fetchCreatorsAndTitles = async (category: string) => {
    let apiUrl = '';
    if (category === 'transcriptions') apiUrl = urlGen.apiSearchTranscriptionTitles();
    else if (category === 'transcribers') apiUrl = urlGen.apiSearchTranscribers();
    else if (category === 'editors') apiUrl = urlGen.apiSearchEditors();
    else if (category === 'editions') apiUrl = urlGen.apiSearchEditionTitles();

    try {
      const response = await fetch(apiUrl);
      const res = await response.json();

      console.log(`API Response for category [${category}]:`, res);

      if (res.status === 'OK') {
        if (category === 'transcriptions' || category === 'editions') {
          setTitleList(res[category] || []);
        } else {
          setCreatorList(res[category] || []);
        }
      } else {
        console.warn(`API returned status ${res.status} for ${category}`, res);
      }
    } catch (e) {
      console.error(`Fetch error for ${category}:`, e);
    }
  };

  // function to trigger the search
  const handleSearchTrigger = () => {
    if (searchStatus !== STATE_INIT || keywords.trim() === "") return;
    const initialContextValue = distance + 1;
    setIsIdle(false);
    setErrorMessage('');
    setResults([]);
    setGlobalContext(initialContextValue);
    storedData.current.data_for_context = [];
    storedData.current.numDisplayedPassages = 0;
    storedData.current.prevTitle = '';
    storedData.current.context = [initialContextValue];
    setSearchStatus(STATE_WAITING_FOR_SERVER);
    startSearch();
  };

  // async search function
  const startSearch = async (page = 1) => {
    const ld = new LanguageDetector('la');
    const detectedLang = ld.detectLang(keywords);
    const inputs = { corpus, searched_phrase: keywords, lang: detectedLang, title: titleInput, creator: creatorInput, keywordDistance: Number(distance) + 1, lemmatize, queryPage: Number(page) };
    try {
      const response = await fetch(urlGen.apiSearchKeyword(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(inputs as any)
      });
      const res = await response.json();
      if (res.status !== 'OK') { setSearchStatus(STATE_INIT); return; }
      handleApiResponse(res, inputs);
      if (!res.queryFinished && storedData.current.numDisplayedPassages < 1000) startSearch(Number(res.queryPage) + 1);
      else setSearchStatus(STATE_INIT);
    } catch (e) { setSearchStatus(STATE_INIT); setErrorMessage("Sorry, the search is currently not available.") }
  };

  // process data from typesense response
  const handleApiResponse = (res: any, inputs: any) => {
    let tokensForQuery = [...res.tokensForQuery];
    if (tokensForQuery[0] === '*') tokensForQuery.shift();
    const kwDist = Number(res.keywordDistance);
    let rawData = collectData(res.query, tokensForQuery[0], tokensForQuery, res.lemmata, kwDist, res.lemmatize, res.corpus);
    for (let i = 0; i < tokensForQuery.length; i++) rawData = filterData(rawData, tokensForQuery[i], res.lemmata[i], res.lemmatize, kwDist);
    rawData = removeOverlappingPassagesOrDuplicates(rawData);

    const newEntries: any[] = [];
    rawData.forEach((match: any) => {
      console.log(match)
      const link = corpus === 'transcriptions' ? urlGen.sitePageView(match.docID, match.seq, match.column) : urlGen.siteCollationTableEdit(match.table_id);
      match.passage_tokenized.forEach((p: any, j: number) => {
        storedData.current.numDisplayedPassages++;
        storedData.current.context[storedData.current.numDisplayedPassages] = Number(inputs.keywordDistance);
        storedData.current.data_for_context.push({ text_tokenized: match.text_tokenized, tokens_matched: match.tokens_matched, position: Number(match.positions[j]) });
        const displayTitle = match.title !== storedData.current.prevTitle ? match.title : "";
        storedData.current.prevTitle = match.title;
        const entry = { id: storedData.current.numDisplayedPassages, passageHtml: cutOutPassageWithHighlights(match.text_tokenized, match.tokens_matched, match.positions[j], kwDist, Number(inputs.keywordDistance)), title: displayTitle, fullTitle: match.title, identifier: corpus === 'transcriptions' ? match.foliation : match.chunk, user: match.creator, link, lang: res.lang };
        newEntries.push(entry);
      });
    });
    setResults(prev => [...prev, ...newEntries]);
  };

  // function to change the context size of a passage
  const handleLocalContextChange = (index: number, newVal: number) => {
    storedData.current.context[index] = newVal;
    const itemData = storedData.current.data_for_context[index - 1];
    const currentKwDist = Number(distance) + 1;
    setResults(prev => prev.map(item => item.id === index ? { ...item, passageHtml: cutOutPassageWithHighlights(itemData.text_tokenized, itemData.tokens_matched, itemData.position, currentKwDist, newVal) } : item));
  };

  // function to change the context size of all passages
  const handleGlobalContextChange = (newVal: number) => {
    setGlobalContext(newVal);
    const currentKwDist = Number(distance) + 1;
    setResults(results.map(item => {
      storedData.current.context[item.id] = newVal;
      const itemData = storedData.current.data_for_context[item.id - 1];
      return { ...item, passageHtml: cutOutPassageWithHighlights(itemData.text_tokenized, itemData.tokens_matched, itemData.position, currentKwDist, newVal) };
    }));
  };

  const getUniqueTitleCount = (resultsList: any[]) => new Set(resultsList.map(res => res.fullTitle)).size;

  const SEARCH_COLUMNS = (
      <colgroup>
        <col width="6%" /><col width="14%" /><col width="6%" /><col width="7%" /><col width="14%" /><col width="14%" /><col width="7%" />
      </colgroup>
  );

  const RESULTS_COLUMNS = (
      <colgroup>
        <col width="45%" /><col width="5%" /><col width="20%" /><col width="10%" /><col width="15%" /><col width="5%" />
      </colgroup>
  );

  const corpusSelectorStyle: React.CSSProperties = {  paddingLeft: '8px', flex: '0.33', textAlign: 'left', textAlignLast: 'left', appearance: 'none', WebkitAppearance: 'none', width:'100%', height: '100%', border: 'none', outline:'none', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer'};
  const inputStyle: React.CSSProperties = { height: '32px', border: '1px solid #ccc', borderRadius: '6px', padding: '4px 8px', width:'90%' };

  return (
      <NormalPageContainer>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '15px' }}>
          <h1 style={{ marginBottom: '10px' }}>Search</h1>
          <table className="docTable dataTable" style={{ width: '100%', tableLayout: 'fixed' }}>
            {SEARCH_COLUMNS}
            <thead style={{ borderTop: '1px solid black' }}>
            <tr style={{ backgroundColor: '#f4f4f4' }}>
              {/* Corpus */}
              <th>
                <div style={{ paddingLeft: '8px', paddingTop: '10px', paddingBottom: '6px', fontSize: '0.9em', textAlign: 'left' }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        Corpus
        <i
            className="fas fa-info-circle"
            title="Choose the target corpus of your search."
            style={{ position: 'absolute', top: '-2px', right: '-10px', fontSize: '0.65em', cursor: 'help', color: '#666' }}
        ></i>
      </span>
                </div>
              </th>

              {/* Keywords */}
              <th>
                <div style={{ paddingTop: '10px',  paddingBottom: '6px', fontSize: '0.9em', textAlign: 'left' }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        Keywords
        <i
            className="fas fa-info-circle"
            title="Enter keywords to search.&#10;• The search is case-insensitive.&#10;• You can use the wildcard operator '*' to search for prefixes, suffixes and infixes, like 'philosoph*', '*losophus' or '*losoph*'.&#10;• Wildcards represent optional characters, i. e. 'philosophi*' will also match 'philosophi'."
            style={{ position: 'absolute', top: '-2px', right: '-10px', fontSize: '0.65em', cursor: 'help', color: '#666' }}
        ></i>
      </span>
                </div>
              </th>

              {/* Keyword Distance */}
              <th className="text-center">
                <div style={{ paddingTop: '10px',  paddingBottom: '6px', fontSize: '0.9em', textAlign: 'center' }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        Keyword Distance
        <i
            className="fas fa-info-circle"
            title="The keyword distance is the number of tokens, i. e. words or punctuation marks, that are allowed to occur between your longest given keyword and each of the others.&#10;Examples:&#10;• With two keywords given a value of 0 means that only the occurrence of directly consecutive words counts as a match.&#10;• With three keywords given a value of 0 means that only the occurrence of your longest keyword in the middle of the other two counts as a match.&#10;In some scenarios it is recommended to double check your search results with a slightly higher keyword distance."
            style={{ position: 'absolute', top: '-2px', right: '-10px', fontSize: '0.65em', cursor: 'help', color: '#666' }}
        ></i>
      </span>
                </div>
              </th>

              {/* Lemmatization */}
              <th className="text-center">
                <div style={{ paddingTop: '10px',  paddingBottom: '6px', fontSize: '0.9em', textAlign: 'center' }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        Lemmatization
        <i
            className="fas fa-info-circle"
            title="If checked, conjugated or declined forms of your keywords will count as matches. Be aware, that automatic lemmatization is not an error-free process and therefore lemmatized search can return false positives and especially can miss some matches. In some scenarios it is recommended to make some checks with unlemmatized search for declined or conjugated forms of your keyword."
            style={{ position: 'absolute', top: '-2px', right: '-10px', fontSize: '0.65em', cursor: 'help', color: '#666' }}
        ></i>
      </span>
                </div>
              </th>

              {/* Document / Edition */}
              <th>
                <div style={{ paddingTop: '10px',  paddingBottom: '6px', fontSize: '0.9em', textAlign: 'left' }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        {corpus === 'transcriptions' ? 'Document' : 'Edition'}
        <i
            className="fas fa-info-circle"
            title="Filters search results by title. Enter the exact full name (case-sensitive) of the target of your search."
            style={{ position: 'absolute', top: '-2px', right: '-10px', fontSize: '0.65em', cursor: 'help', color: '#666' }}
        ></i>
      </span>
                </div>
              </th>

              {/* Transcriber / Editor */}
              <th>
                <div style={{ paddingTop: '10px',  paddingBottom: '6px', fontSize: '0.9em', textAlign: 'left' }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        {corpus === 'transcriptions' ? 'Transcriber' : 'Editor'}
        <i
            className="fas fa-info-circle"
            title="Filters search results by person name. Enter the full name, first name, last name or only the beginning of the first or last name of a person."
            style={{ position: 'absolute', top: '-2px', right: '-10px', fontSize: '0.65em', cursor: 'help', color: '#666' }}
        ></i>
      </span>
                </div>
              </th>

              <th className="text-center"></th>
            </tr>
            </thead>
            <tbody>
            <tr><td style={{paddingTop:'0px',  paddingBottom: '6px',}}></td></tr>
            <tr>
              <td>
                <select value={corpus} onChange={(e) => setCorpus(e.target.value)} style={corpusSelectorStyle}>
                  <option value="transcriptions">Transcriptions</option>
                  <option value="editions">Editions</option>
                </select>
              </td>
              <td>
                <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    style={inputStyle}
                />
              </td>
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <GlobalContextKnob
                      value={distance}
                      onChange={(val) => {
                        const min = getMinDistance(keywords);
                        if (val < min) {
                          setDistance(min);
                          setErrorMessage(`The minimum keyword distance for ${keywords.split(/\s+/).length} keywords is ${min}.`);
                        } else {
                          setDistance(val);
                          setErrorMessage('');
                        }
                      }}
                      showValueInside={true}
                  />
                </div>
              </td>
              <td style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                <input
                    type="checkbox"
                    checked={lemmatize}
                    onChange={(e) => setLemmatize(e.target.checked)}
                    style={{
                      width: '15px',
                      height: '15px',
                      cursor: 'pointer',
                      margin: 0,
                      accentColor: 'black'
                    }}
                />
              </td>
              <td>
                <input list="titleList" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} style={inputStyle} />
                <datalist id="titleList">{titleList.map(t => <option key={t} value={t} />)}</datalist>
              </td>
              <td>
                <input list="creatorList" value={creatorInput} onChange={(e) => setCreatorInput(e.target.value)} style={inputStyle} />
                <datalist id="creatorList">{creatorList.map(c => <option key={c} value={c} />)}</datalist>
              </td>
              <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'center' }}>
                <button
                    id="search-submit-button"
                    onClick={handleSearchTrigger}
                    className="btn btn-primary"
                    disabled={isInvalidSearch || searchStatus !== STATE_INIT || keywords.trim() === ""}
                    style={{
                      width: '80%',
                      height: '32px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isInvalidSearch ? "#ccc" : "black", // Grey if invalid
                      borderColor: isInvalidSearch ? "#ccc" : "black",
                      cursor: isInvalidSearch ? "not-allowed" : "pointer"
                    }}
                >
                  <i className="fas fa-search" style={{ color: 'white' }}></i>
                </button>
              </td>
            </tr>
            </tbody>
          </table>

          {isInvalidSearch && (
              <div className="fade-in-element" style={{ textAlign: 'center', marginTop: '2em', fontWeight: 'bold' }}>
                Wildcards (*) and lemmatization cannot be combined.
              </div>
          )}

          {errorMessage && (
              <div className="fade-in-element" style={{ textAlign: 'center', marginTop: '2em', fontWeight: 'bold' }}>
                {errorMessage}
              </div>
          )}

          {results.length > 0 && (
              <div style={{ marginTop: '25px' }}>
                <table className="docTable dataTable no-footer" style={{ width: '100%', tableLayout: 'fixed' }}>
                  {RESULTS_COLUMNS}
                  <thead style={{ borderTop: '1px solid black' }}>
                  <tr style={{ backgroundColor: '#f4f4f4' }}>
                    <th style={{ padding: '10px', paddingLeft: '8px' }}>Matched Passage ({results.length})</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Context</th>
                    <th className="text-center">Title ({getUniqueTitleCount(results)})</th>
                    <th className="text-center">{corpus === 'transcriptions' ? 'Foliation' : 'Chunk'}</th>
                    <th className="text-center">{corpus === 'transcriptions' ? 'Transcriber' : 'Editor'}</th>
                    <th className="text-center">Link</th>
                  </tr>
                  </thead>
                  <tbody>
                  {results.map((res, index) => (
                      <tr key={res.id} className="fade-in-element" style={{ fontSize: '0.95em', borderBottom: '1px solid #eee' }}>
                        <td className={`text-${res.lang}`} style={{ padding: '8px', textAlign: 'justify' }} dangerouslySetInnerHTML={{ __html: res.passageHtml }} />
                        <td style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0' }}>
                          <GlobalContextKnob value={storedData.current.context[res.id]} onChange={(val) => handleLocalContextChange(res.id, val)} />
                        </td>
                        <td className="text-center">{res.title}</td>
                        <td className="text-center">{res.identifier}</td>
                        <td className="text-center">{res.user}</td>
                        <td className="text-center">
                          <a className="fas fa-external-link-alt" target="_blank" href={res.link} rel="noreferrer" style={{ color: '#007bff' }}></a>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
          )}

          {!isIdle && searchStatus === STATE_INIT && results.length === 0 && !errorMessage && (
              <div className="fade-in-element" style={{ textAlign: 'center', marginTop: '2em', fontWeight: 'bold' }}>
                Nothing found.
              </div>
          )}
        </div>
      </NormalPageContainer>
  );
}

// LOGIC FUNCTIONS
function collectData(query: any[], token: string, tokensForQuery: string[], lemmata: string[], keywordDistance: number, lemmatize: boolean, corpus: string) {
  const filter = getFilterType(token);
  const tokenClean = token.replace(/\*/g, "");
  let data: any[] = [];
  if (query && query.length !== 0) {
    for (let i = 0; i < query.length; i++) {
      const doc = query[i].document;
      let textTokenized = corpus === 'transcriptions' ? doc.transcription_tokens : doc.edition_tokens;
      let textLemmatized = corpus === 'transcriptions' ? doc.transcription_lemmata : doc.edition_lemmata;

      let posLower = lemmatize ? getPositions(textLemmatized, lemmata[0], 'lemma') : getPositions(textTokenized, tokenClean, filter);
      let posUpper = lemmatize ? getPositions(textLemmatized, capitalizeFirstLetter(lemmata[0]), 'lemma') : getPositions(textTokenized, capitalizeFirstLetter(tokenClean), filter);

      const posAll = [...new Set([...posLower, ...posUpper])].sort((a, b) => a - b);
      let passageTokenized: string[][] = [];
      let passageLemmatized: string[][] = [];
      let passageCoordinates: [number, number][] = [];

      posAll.forEach(pos => {
        let passageData = getPassage(textTokenized, pos, keywordDistance);
        passageTokenized.push(passageData.passage);
        passageCoordinates.push([passageData.start, passageData.end]);
        if (lemmatize) passageLemmatized.push(getPassage(textLemmatized, pos, keywordDistance).passage);
      });

      data.push({
        column: doc.column,
        corpus: corpus,
        creator: doc.creator,
        docID: doc.docID,
        foliation: doc.foliation,
        keywordDistance: keywordDistance,
        lemmata: lemmata,
        lemmatize: lemmatize,
        matched_token_positions: Array.from({ length: passageTokenized.length }, () => []),
        passage_coordinates: passageCoordinates,
        passage_lemmatized: passageLemmatized,
        passage_tokenized: passageTokenized,
        positions: posAll,
        text_lemmatized: textLemmatized,
        text_tokenized: textTokenized,
        title: doc.title,
        tokensForQuery: tokensForQuery,
        tokens_matched: []
      });
    }
  }
  return data;
}

function filterData(data: any[], tokenPlain: string, lemma: string, lemmatize: boolean, kwDist: number) {
  // If lemmatization is active but the lemma is only 1 character long (or empty),
  // skip filtering to prevent "over-filtering".
  if (lemmatize && (!lemma || lemma.length <= 1)) {
    return data;
  }

  const filter = getFilterType(tokenPlain);
  const tokenClean = tokenPlain.replace(/\*/g, "");

  data.forEach((match: any) => {
    match.passage_tokenized.forEach((passage: any, j: number) => {
      if (!passage) return;
      let matchedInThisPassage = false;
      const startOfPassage = match.passage_coordinates[j][0];
      const anchorPos = match.positions[j];
      const searchTarget = lemmatize ? match.passage_lemmatized[j] : passage;

      searchTarget.forEach((t: string, k: number) => {
        const isMatch = lemmatize ? isLemmaOfWord(lemma, t) : isMatching(t, tokenClean, filter);
        if (isMatch && Math.abs((startOfPassage + k) - anchorPos) <= kwDist) {
          match.tokens_matched.push(match.passage_tokenized[j][k]);
          match.matched_token_positions[j].push(startOfPassage + k);
          matchedInThisPassage = true;
        }
      });

      if (!matchedInThisPassage) {
        delete match.passage_tokenized[j];
        delete match.matched_token_positions[j];
        delete match.positions[j];
      }
    });
    match.tokens_matched = [...new Set(match.tokens_matched)];
  });

  return data;
}

function getFilterType(t: string) { if (!t || !t.includes('*')) return 'match_full'; if (t.startsWith('*') && t.endsWith('*')) return 'match_body'; return t.startsWith('*') ? 'match_suffix' : 'match_prefix'; }
function getPositions(text: any[], token: string, filter: string) { const res: number[] = []; if (!text || !token || token.length === 0) return res; text.forEach((t, i) => { if (t && (filter === 'lemma' ? isLemmaOfWord(token, t) : isMatching(t, token, filter))) res.push(i); }); return res; }
function getPassage(text: any[], pos: number, kwDist: number) { const start = Math.max(0, pos - kwDist); const end = Math.min(text.length, pos + kwDist + 1); return { passage: text.slice(start, end), start, end }; }
function isMatching(token: string, needle: string, filter: string): boolean { if (!needle || !token) return false; if (filter === 'match_full') return token === needle || token === capitalizeFirstLetter(needle); if (filter === 'match_prefix') return token.startsWith(needle) || token.startsWith(capitalizeFirstLetter(needle)); if (filter === 'match_suffix') return token.endsWith(needle) || token.endsWith(capitalizeFirstLetter(needle)); if (filter === 'match_body') return token.includes(needle); return false; }
function isLemmaOfWord(lemma: string, token: string): boolean {
  // Old code did NOT use toLowerCase() and
  // compared exactly in this way with spaces:
  if (!token || !lemma) return false;
  return token.includes(" " + lemma + " ") || token === lemma;
}
function capitalizeFirstLetter(string: string) { return string ? string.charAt(0).toUpperCase() + string.slice(1) : ""; }
function removeBlanks(s: string) { return s.replace(/\s([.,:;?\])])/g, '$1').replace(/([(\[])\s/g, '$1').trim(); }

function removeDuplicatesAndSubsets(array: number[][]): number[] {
  const cleanMatchedTokenPositions = new Set<number>(array.keys());
  array.forEach((item, index) => {
    array.forEach((existingItem, existingIndex) => {
      if (index !== existingIndex && cleanMatchedTokenPositions.has(index) && cleanMatchedTokenPositions.has(existingIndex)) {
        if (item.every(val => existingItem.includes(val))) cleanMatchedTokenPositions.delete(index);
      }
    });
  });
  return Array.from(cleanMatchedTokenPositions);
}

function removeOverlappingPassagesOrDuplicates(data: any[]): any[] {
  return data.map(match => {
    const cleanIndices = removeDuplicatesAndSubsets(match.matched_token_positions);
    match.matched_token_positions = match.matched_token_positions.filter((_: any, i: number) => cleanIndices.includes(i));
    match.passage_tokenized = match.passage_tokenized.filter((_: any, i: number) => cleanIndices.includes(i));
    match.positions = match.positions.filter((_: any, i: number) => cleanIndices.includes(i));
    return match;
  }).filter(match => match.passage_tokenized.length > 0);
}

function getMinDistance(keywordString: string): number {
  const n = keywordString.trim().split(/\s+/).filter(Boolean).length;
  if (n <= 1) return 0;
  return n % 2 === 0 ? n - (Math.floor(n / 2) + 1) : n - (Math.floor(n / 2) + 2);
}

function cutOutPassageWithHighlights(text: any[], matched: string[], pos: number, kwDist: number, contextVal: number) {
  const start = Math.max(0, pos - contextVal);
  const end = Math.min(text.length, pos + contextVal + 1);
  const matchedLower = matched.map(m => m.toLowerCase());

  const words = text.slice(start, end);
  let passage = "";

  words.forEach((t, i) => {
    const absolutePos = start + i;
    const distanceToAnchor = Math.abs(absolutePos - pos);
    const isMatched = matchedLower.includes(t.toLowerCase()) && distanceToAnchor <= kwDist;
    const isNew = distanceToAnchor > kwDist;
    const className = isNew ? 'class="new-word-fade"' : '';

    // LOGIC FOR SPACES:
    const isPunctuation = /^[\.,:;!\?\]\)]/.test(t);
    // Check if the PREVIOUS word was an opening bracket
    const prevWasOpeningBracket = i > 0 && /^[\(\[]/.test(words[i - 1]);

    // Space only if:
    // 1. Not the first word
    // 2. Current word is not punctuation (dot, comma, etc.)
    // 3. Previous word was not an opening bracket
    if (i > 0 && !isPunctuation && !prevWasOpeningBracket) {
      passage += " ";
    }

    let wordHtml = t;
    if (isMatched) {
      wordHtml = `<mark style="background-color: #ebd5d0">${t}</mark>`;
    } else if (isNew) {
      wordHtml = `<span ${className}>${t}</span>`;
    }

    passage += wordHtml;
  });

  return passage.replace(/^[\s\.,:;!\?]+/, '').trim();
}