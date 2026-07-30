import {Edition} from "@/Edition/Edition";
import './MainTextPanel.css';
import {Button, Form} from "react-bootstrap";
import {MainTextToken} from "@/Edition/MainTextToken";
import {Fragment, JSX, useEffect, useMemo, useState} from "react";
import {TriangleFill} from "react-bootstrap-icons";

interface MainTextPanelProps {
  edition: Edition | null;
  generationProgress: number | null;
  editionOutOfDate: boolean;
  onClickRegenerate: () => void | Promise<void>;
  paginationThreshold?: number;
  minParsPerPage?: number;
  maxParsPerPage?: number;
}

interface Paragraph {
  style: string;
  tokens: MainTextToken[];
  chunks: ParagraphChunk[];
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
                                        generationProgress,
                                        editionOutOfDate,
                                        onClickRegenerate,
                                        paginationThreshold = defaultPaginationThreshold,
                                        minParsPerPage = defaultMinParsPerPage,
                                        maxParsPerPage = defaultMaxParsPerPage
                                      }: MainTextPanelProps) {



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
      chunks: []
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

    edition.mainText.forEach((token) => {
      switch (token.type) {
        case 'text':
        case 'glue':
          currentParagraph.tokens.push(token);
          break;

        case 'paragraph_end':
          currentParagraph.style = token.style;
          paragraphs.push(currentParagraph);
          currentParagraph = {
            style: '',
            tokens: [],
            chunks: []
          };
          break;

        case 'chunk_start':
          if (token.chunkId !== undefined && token.chunkId !== '') {
            registerChunkToken(token.chunkId, token.type);
          }
          currentParagraph.tokens.push(token);
          break;

        case 'chunk_end':
          if (token.chunkId !== undefined && token.chunkId !== '') {
            registerChunkToken(token.chunkId, token.type);
          }
          currentParagraph.tokens.push(token);
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
      if (token.type === 'text' || token.type === 'glue') {
        elementArray.push(<Fragment key={`token-${i}`}>{token.getPlainText()}</Fragment>);
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

  useEffect(() => {
    setCurrentPage(0);
  }, [edition]);

  useEffect(() => {
    if (pageCount === 0) {
      return;
    }
    if (currentPage > pageCount - 1) {
      setCurrentPage(pageCount - 1);
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
    <div className={'main-text-panel'}>
      {editionOutOfDate &&
        <div className={'out-of-date'}>Edition is out of date. {generationProgress === null ?
          <Button variant="outline-secondary"
                  onClick={onClickRegenerate}>Regenerate</Button> : 'Regenerating...'}
        </div>}
      {isPaginated &&
        <div className={'main-text-pagination'}>
          <div className={'main-text-pagination-nav'}>
            <Button size="sm"
                    variant="outline-secondary"
                    className={'main-text-pagination-first'}
                    title="First page"
                    disabled={currentPage === 0}
                    onClick={() => goToPage(0)}>{'First'}</Button>
            <Button size="sm"
                    variant="outline-secondary"
                    className={'main-text-pagination-previous'}
                    title="Previous page"
                    disabled={currentPage === 0}
                    onClick={() => goToPage(currentPage - 1)}>{'Previous'}</Button>
            <Button size="sm"
                    variant="outline-secondary"
                    className={'main-text-pagination-next'}
                    title="Next page"
                    disabled={currentPage === pageCount - 1}
                    onClick={() => goToPage(currentPage + 1)}>{'Next'}</Button>
            <Button size="sm"
                    variant="outline-secondary"
                    className={'main-text-pagination-last'}
                    title="Last page"
                    disabled={currentPage === pageCount - 1}
                    onClick={() => goToPage(pageCount - 1)}>{'Last'}</Button>
          </div>
          <div className={'main-text-pagination-jump'}>
            <Form.Select size="sm"
                         className={'main-text-pagination-select'}
                         value={currentPage}
                         onChange={(e) => goToPage(parseInt(e.target.value))}>
              {paragraphPages.map((page, index) => <option key={page.label + index} value={index}>{page.label}</option>)}
            </Form.Select>
          </div>
        </div>}
      <div className={mainTextClasses.join(' ')}>
        <div className={'left-margin'}></div>
        <div className={'main-text-content'}>{currentParagraphs.map((p, i) => <ParagraphComponent p={p}
                                                                                               key={i}/>)}</div>
        <div className={'right-margin'}></div>
      </div>
    </div>
  );
}