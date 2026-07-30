import {Edition} from "@/Edition/Edition";
import './MainTextPanel.css';
import {Button, Form} from "react-bootstrap";
import {MainTextToken} from "@/Edition/MainTextToken";
import {Fragment, JSX, useEffect, useMemo, useState} from "react";

interface MainTextPanelProps {
  edition: Edition | null;
  generationProgress: number | null;
  editionOutOfDate: boolean;
  onClickRegenerate: () => void | Promise<void>;
  paginationThreshold?: number;
  parsPerPage?: number;
  minLastPageParCount?: number;
  showSelectThreshold?: number;
}

interface Paragraph {
  style: string;
  tokens: MainTextToken[];
  chunkStartIds: string[];
}

interface ParagraphPage {
  paragraphs: Paragraph[];
  label: string;
}

const defaultPaginationThreshold = 40;
const defaultParsPerPage = 20;
const defaultMinLastPageParCount = 3;
const defaultShowSelectThreshold = 5;

export default function MainTextPanel({
                                        edition,
                                        generationProgress,
                                        editionOutOfDate,
                                        onClickRegenerate,
                                        paginationThreshold = defaultPaginationThreshold,
                                        parsPerPage = defaultParsPerPage,
                                        minLastPageParCount = defaultMinLastPageParCount,
                                        showSelectThreshold = defaultShowSelectThreshold
                                      }: MainTextPanelProps) {

  const getPageLabel = (chunkIds: string[]): string => {
    if (chunkIds.length === 0) {
      return '— → —';
    }
    return `${chunkIds[0]} → ${chunkIds[chunkIds.length - 1]}`;
  };

  const getParagraphPages = (paragraphs: Paragraph[]): ParagraphPage[] => {
    if (paragraphs.length === 0) {
      return [];
    }
    if (paginationThreshold < 1 || paragraphs.length <= paginationThreshold) {
      return [{
        paragraphs,
        label: getPageLabel(paragraphs.flatMap((paragraph) => paragraph.chunkStartIds))
      }];
    }

    const pageSizes: number[] = [];
    let remainingParagraphs = paragraphs.length;
    while (remainingParagraphs > 0) {
      const pageSize = Math.min(parsPerPage, remainingParagraphs);
      pageSizes.push(pageSize);
      remainingParagraphs -= pageSize;
    }

    const lastPageIndex = pageSizes.length - 1;
    if (pageSizes.length > 1 && pageSizes[lastPageIndex] < minLastPageParCount) {
      let paragraphsNeeded = minLastPageParCount - pageSizes[lastPageIndex];
      while (paragraphsNeeded > 0) {
        let paragraphsMoved = false;
        for (let i = pageSizes.length - 2; i >= 0 && paragraphsNeeded > 0; i--) {
          if (pageSizes[i] <= 1) {
            continue;
          }
          pageSizes[i] -= 1;
          pageSizes[lastPageIndex] += 1;
          paragraphsNeeded -= 1;
          paragraphsMoved = true;
        }
        if (!paragraphsMoved) {
          break;
        }
      }
    }

    const pages: ParagraphPage[] = [];
    let start = 0;
    pageSizes.forEach((size) => {
      const pageParagraphs = paragraphs.slice(start, start + size);
      const pageChunkIds = pageParagraphs.flatMap((paragraph) => paragraph.chunkStartIds);
      pages.push({
        paragraphs: pageParagraphs,
        label: getPageLabel(pageChunkIds)
      });
      start += size;
    });
    return pages;
  };

  const getParagraphs = (edition: Edition): Paragraph[] => {
    const paragraphs: Paragraph[] = [];
    let currentParagraph: Paragraph = {
      style: '',
      tokens: [],
      chunkStartIds: []
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
            chunkStartIds: []
          };
          break;

        case 'chunk_start':
          if (token.chunkId !== undefined && token.chunkId !== '') {
            currentParagraph.chunkStartIds.push(token.chunkId);
          }
          currentParagraph.tokens.push(token);
          break;
        case 'chunk_end':
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
          <span className={'chunk-mark'} key={`chunk-mark-${i}-${token.chunkId ?? ''}`}>
            <span className={'chunk-mark-icon'} title={`Start of chunk ${token.chunkId ?? ''}`}>{'::'} </span>
            <span className={'chunk-mark-label'}>{token.chunkId}</span>
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
  const paragraphPages = useMemo(() => getParagraphPages(paragraphs), [paragraphs]);
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
            {pageCount < showSelectThreshold
              ? paragraphPages.map((page, index) => (
                <Button key={page.label + index}
                        size="sm"
                        className={'main-text-pagination-page-button'}
                        variant={index === currentPage ? 'secondary' : 'outline-secondary'}
                        onClick={() => goToPage(index)}>{page.label}</Button>
              ))
              : <Form.Select size="sm"
                             className={'main-text-pagination-select'}
                             value={currentPage}
                             onChange={(e) => goToPage(parseInt(e.target.value))}>
                {paragraphPages.map((page, index) => <option key={page.label + index} value={index}>{page.label}</option>)}
              </Form.Select>}
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