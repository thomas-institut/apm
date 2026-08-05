import {Edition} from "@/Edition/Edition";
import './MainTextPanel.css';
import {Button, OverlayTrigger, Popover} from "react-bootstrap";
import {MainTextToken} from "@/Edition/MainTextToken";
import {Fragment, JSX, useEffect, useMemo, useState} from "react";
import {TabbableElementProps} from "@/ReactAPM/Components/PanelUI/TabPanel";
import {StandardizedWord} from "@/ReactAPM/Pages/MceComposer/StandardizedWords";
import {ArrowCounterclockwise, Check, Check2Circle, X, XCircle} from "react-bootstrap-icons";
import {StandardizedStringInstanceStatus} from "@/MceData/StandardizedString";
import Panel from "@/ReactAPM/Components/PanelUI/Panel";
import PanelContent from "@/ReactAPM/Components/PanelUI/PanelContent";
import Toolbar from "@/ReactAPM/Components/PanelUI/Toolbar";
import NiceToggle from "@/ReactAPM/Components/NiceToggle/NiceToggle";
import ToolbarPageControls from "@/ReactAPM/Pages/MceComposer/ToolbarPageControls";

interface MainTextPanelProps extends TabbableElementProps{
  edition: Edition | null;
  standardizedWords: StandardizedWord[];
  generationProgress: number | null;
  editionOutOfDate: boolean;
  onClickRegenerate: () => void | Promise<void>;
  setInstanceStatus: (str: string, index: number, status: StandardizedStringInstanceStatus) => Promise<true | string>;
  paginationThreshold?: number;
  minParsPerPage?: number;
  maxParsPerPage?: number;
}

interface Paragraph {
  style: string;
  tokens: MainTextToken[];
  chunks: ParagraphChunk[];
  tokenIndices: number[];
}

interface ParagraphChunk {
  chunkId: string;
  hasStart: boolean;
  hasEnd: boolean;
}

interface ParagraphPage {
  paragraphs: Paragraph[];
  label: string;
}

const defaultPaginationThreshold = 25;
const defaultMinParsPerPage = 20;
const defaultMaxParsPerPage = 30;
export const fullyContainedFirstChunkMarker = '‣ ';
export const fullyContainedLastChunkMarker = ' ∷';

const chunkStartMarker = '| ';
const chunkEndMarker = '☐';

export default function MainTextPanel({
                                        edition,
                                        standardizedWords,
                                        generationProgress,
                                        editionOutOfDate,
                                        onClickRegenerate,
                                        setInstanceStatus,
                                        paginationThreshold = defaultPaginationThreshold,
                                        minParsPerPage = defaultMinParsPerPage,
                                        maxParsPerPage = defaultMaxParsPerPage
                                      }: MainTextPanelProps) {



  const standardizedData = useMemo(() => {
    const map = new Map<number, { status: 'rejected' | 'accepted' | 'notReviewed', original: string, standard: string }>();
    standardizedWords.forEach((word) => {
      word.instances.forEach((instance) => {
        map.set(instance.mainTextIndex, { status: instance.status, original: word.original, standard: word.standardized });
      });
    });
    return map;
  }, [standardizedWords]);

  const getPageChunks = (paragraphs: Paragraph[]): ParagraphChunk[] => {
    const pageChunks: ParagraphChunk[] = [];
    const pageChunksById = new Map<string, ParagraphChunk>();

    paragraphs.forEach((paragraph) => {
      paragraph.chunks.forEach((chunk) => {
        const existingChunk = pageChunksById.get(chunk.chunkId);
        if (existingChunk === undefined) {
          const newChunk: ParagraphChunk = {
            chunkId: chunk.chunkId,
            hasStart: chunk.hasStart,
            hasEnd: chunk.hasEnd
          };
          pageChunksById.set(chunk.chunkId, newChunk);
          pageChunks.push(newChunk);
          return;
        }

        existingChunk.hasStart = existingChunk.hasStart || chunk.hasStart;
        existingChunk.hasEnd = existingChunk.hasEnd || chunk.hasEnd;
      });
    });

    return pageChunks;
  };

  const isLastChunkFullyContained = (paragraphs: Paragraph[]): boolean => {
    const pageChunks = getPageChunks(paragraphs);
    if (pageChunks.length === 0) {
      return true;
    }

    const lastChunk = pageChunks[pageChunks.length - 1];
    return lastChunk.hasEnd;
  };

  const getPageLabel = (paragraphs: Paragraph[]): string => {
    const pageChunks = getPageChunks(paragraphs);

    if (pageChunks.length === 0) {
      return '— → —';
    }

    const firstChunk = pageChunks[0];
    const lastChunk = pageChunks[pageChunks.length - 1];

    const firstChunkLabel = `${firstChunk.hasStart ? fullyContainedFirstChunkMarker : ''}${firstChunk.chunkId}`;
    const lastChunkLabel = `${lastChunk.chunkId}${lastChunk.hasEnd ? fullyContainedLastChunkMarker : ''}`;

    return `${firstChunkLabel} → ${lastChunkLabel}`;
  };

  const getParagraphPages = (paragraphs: Paragraph[]): ParagraphPage[] => {
    if (paragraphs.length === 0) {
      return [];
    }
    if (paginationThreshold < 1 || paragraphs.length <= paginationThreshold) {
      return [{
        paragraphs,
        label: getPageLabel(paragraphs)
      }];
    }

    const normalizedMinParsPerPage = Math.max(1, minParsPerPage);
    const normalizedMaxParsPerPage = Math.max(normalizedMinParsPerPage, maxParsPerPage);

    const pages: ParagraphPage[] = [];
    let start = 0;
    while (start < paragraphs.length) {
      let end = Math.min(start + normalizedMinParsPerPage, paragraphs.length);

      while (end < paragraphs.length
      && end - start < normalizedMaxParsPerPage
      && !isLastChunkFullyContained(paragraphs.slice(start, end))) {
        end += 1;
      }

      const pageParagraphs = paragraphs.slice(start, end);
      pages.push({
        paragraphs: pageParagraphs,
        label: getPageLabel(pageParagraphs)
      });
      start = end;
    }

    return pages;
  };

  const getParagraphs = (edition: Edition): Paragraph[] => {
    const paragraphs: Paragraph[] = [];
    let currentParagraph: Paragraph = {
      style: '',
      tokens: [],
      chunks: [],
      tokenIndices: []
    };

    const registerChunkToken = (chunkId: string, tokenType: 'chunk_start' | 'chunk_end') => {
      const existingChunk = currentParagraph.chunks.find((chunk) => chunk.chunkId === chunkId);
      if (existingChunk === undefined) {
        currentParagraph.chunks.push({
          chunkId,
          hasStart: tokenType === 'chunk_start',
          hasEnd: tokenType === 'chunk_end'
        });
        return;
      }

      if (tokenType === 'chunk_start') {
        existingChunk.hasStart = true;
      } else {
        existingChunk.hasEnd = true;
      }
    };

    edition.mainText.forEach((token, index) => {
      switch (token.type) {
        case 'text':
        case 'glue':
          currentParagraph.tokens.push(token);
          currentParagraph.tokenIndices.push(index);
          break;

        case 'paragraph_end':
          currentParagraph.style = token.style;
          paragraphs.push(currentParagraph);
          currentParagraph = {
            style: '',
            tokens: [],
            chunks: [],
            tokenIndices: []
          };
          break;

        case 'chunk_start':
          if (token.chunkId !== undefined && token.chunkId !== '') {
            registerChunkToken(token.chunkId, token.type);
          }
          currentParagraph.tokens.push(token);
          currentParagraph.tokenIndices.push(index);
          break;

        case 'chunk_end':
          if (token.chunkId !== undefined && token.chunkId !== '') {
            registerChunkToken(token.chunkId, token.type);
          }
          currentParagraph.tokens.push(token);
          currentParagraph.tokenIndices.push(index);
          break;
      }
    });
    if (currentParagraph.tokens.length > 0) {
      paragraphs.push(currentParagraph);
    }
    return paragraphs;
  };

  const getParagraphText = (p: Paragraph): JSX.Element[] => {
    const elementArray: JSX.Element[] = [];
    p.tokens.forEach((token, i) => {
      const globalIndex = p.tokenIndices[i];
      const data = standardizedData.get(globalIndex);

      if (token.type === 'text' || token.type === 'glue') {
        const text = token.getPlainText();
        if (data !== undefined && showStandardizedWords) {
          const statusClass = data.status === 'notReviewed' ? 'not-reviewed' : data.status;
          const classes = [ 'standardized-word', statusClass ];
          if (editionOutOfDate) {
            classes.push('disabled');
          }
          let spanTitleStatus = 'Standardization not reviewed, click to accept or rejected'
          if (data.status === 'accepted') {
            spanTitleStatus = `Standardization accepted, original is '${data.original}'`
          }
          if (data.status === 'rejected') {
            spanTitleStatus = `Standardization rejected, standard is '${data.standard}'`
          }
          const spanTitle = editionOutOfDate ? 'Edition out of date' : spanTitleStatus;
          const spanElement = <span className={classes.join(' ')} title={spanTitle}>{text}</span>;
          if (editionOutOfDate) {
            elementArray.push(<Fragment key={`token-${i}`}>{spanElement}</Fragment>);
          } else {
            const popover = (
              <Popover id={`popover-${globalIndex}`} className="standardized-word-popover">
                <div className="d-flex gap-2 p-2">
                  <Button variant="outline-success" size="sm" onClick={() => setInstanceStatus(data.original, globalIndex, 'accepted')} title="Accept">
                    <Check />
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={() => setInstanceStatus(data.original, globalIndex, 'rejected')} title="Reject">
                    <X />
                  </Button>
                  <Button variant="outline-secondary" size="sm" onClick={() => setInstanceStatus(data.original, globalIndex, 'notReviewed')} title="Reset">
                    <ArrowCounterclockwise />
                  </Button>
                </div>
              </Popover>
            );
            elementArray.push(
              <OverlayTrigger key={`token-${i}`} trigger="click" rootClose placement="top" overlay={popover}>
                {spanElement}
              </OverlayTrigger>
            );
          }
        } else {
          elementArray.push(<Fragment key={`token-${i}`}>{text}</Fragment>);
        }
        return;
      }
      if (token.type === 'chunk_start') {
        elementArray.push(
          <span className={'chunk-mark'} key={`chunk-mark-start-${i}-${token.chunkId ?? ''}`}>
            <span className={'chunk-mark-icon chunk-start'} title={`Start of chunk ${token.chunkId ?? ''}`}>{chunkStartMarker}</span>
            <span className={'chunk-mark-label'}>{token.chunkId}</span>
          </span>
        );
      }
      if (token.type === 'chunk_end') {
        elementArray.push(
          <span className={'chunk-mark'} key={`chunk-mark-end-${i}-${token.chunkId ?? ''}`}>
            <span className={'chunk-mark-icon chunk-end'} title={`End of chunk ${token.chunkId ?? ''}`}>{chunkEndMarker}</span>
          </span>
        );
      }
    });
    return elementArray;
  };

  const ParagraphComponent = (props: { p: Paragraph }) => {
    return <p className={props.p.style}>{getParagraphText(props.p)}</p>;
  };
  const paragraphs = useMemo(() => edition === null ? [] : getParagraphs(edition), [edition]);
  const paragraphPages = useMemo(() => getParagraphPages(paragraphs), [paragraphs, paginationThreshold, minParsPerPage, maxParsPerPage]);
  const isPaginated = paginationThreshold > 0 && paragraphs.length > paginationThreshold;
  const pageCount = paragraphPages.length;

  const [currentPage, setCurrentPage] = useState(0);
  const [showStandardizedWords, setShowStandardizedWords] = useState(true);

  useEffect(() => {
    if (pageCount > 0 && currentPage >= pageCount) {
      setCurrentPage(0);
    }
  }, [currentPage, pageCount]);

  if (edition === null) {
    return <div className={'main-text-panel no-edition'}><p>No main text to show yet</p></div>;
  }

  const goToPage = (page: number) => {
    const boundedPage = Math.max(0, Math.min(page, pageCount - 1));
    setCurrentPage(boundedPage);
  };

  const currentParagraphs = isPaginated
    ? (paragraphPages[currentPage]?.paragraphs ?? [])
    : paragraphs;

  const mainTextClasses = ['main-text', 'text-' + edition?.lang];

  return (
    <Panel className={'main-text-panel'}>
      <Toolbar>
        <div className={'toolbar-group'}>{standardizedWords.length > 0 && <span>
          Std. words:  <NiceToggle isOn={showStandardizedWords}
                                           on={'Shown'}
                                           off={'Hidden'}
                                           onTitle={'Click to hide standardized words'}
                                           offTitle={'Click to show standardized words'}
                                           onClick={setShowStandardizedWords}/>
        </span>}
          { standardizedWords.length === 0 && <span>No standardized words defined</span>}

        </div>
        <div className={'toolbar-group center'}>
          {isPaginated && <ToolbarPageControls page={currentPage}
                                                totalPages={pageCount}
                                                labels={paragraphPages.map((page) => page.label)}
                                                onChange={goToPage}/>}
        </div>
        <div className={'toolbar-group right'}>
          {!editionOutOfDate && <span className={'text-success'}><Check2Circle/> <span>Up to date</span></span>}
          {editionOutOfDate && (generationProgress === null ?
            <span className={'tb-btn text-danger'} onClick={onClickRegenerate} title={'Click to regenerate edition'}><XCircle/> Out of date</span> :
            <span>Regenerating...</span>)}
        </div>
      </Toolbar>
      <PanelContent>
        <div className={mainTextClasses.join(' ')}>
          <div className={'left-margin'}></div>
          <div className={'main-text-content'}>{currentParagraphs.map((p, i) => <ParagraphComponent p={p}
                                                                                                 key={i}/>)}</div>
          <div className={'right-margin'}></div>
        </div>
      </PanelContent>
    </Panel>
  );
}