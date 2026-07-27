import {Edition} from "@/Edition/Edition";
import './MainTextPanel.css';
import {Button} from "react-bootstrap";
import {MainTextToken} from "@/Edition/MainTextToken";
import {Fragment, JSX} from "react";
import {SignpostSplit} from "react-bootstrap-icons";

interface MainTextPanelProps {
  edition: Edition | null;
  generationProgress: number | null;
  editionOutOfDate: boolean;
  onClickRegenerate: () => void | Promise<void>;
}

interface Paragraph {
  style: string;
  tokens: MainTextToken[];
}

export default function MainTextPanel({
                                        edition,
                                        generationProgress,
                                        editionOutOfDate,
                                        onClickRegenerate
                                      }: MainTextPanelProps) {

  const getParagraphs = (edition: Edition): Paragraph[] => {
    const paragraphs: Paragraph[] = [];
    let currentParagraph: Paragraph = {
      style: '',
      tokens: []
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
            tokens: []
          };
          break;

        case 'chunk_start':
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
  if (edition === null) {
    return <div className={'main-text-panel initializing'}>Initializing...</div>;
  }

  const mainTextClasses = ['main-text', 'text-' + edition?.lang];

  return (
    <div className={'main-text-panel'}>
      {editionOutOfDate &&
        <div className={'out-of-date'}>Edition is out of date. {generationProgress === null ?
          <Button variant="outline-secondary"
                  onClick={onClickRegenerate}>Regenerate</Button> : 'Regenerating...'}
        </div>}
      <div className={mainTextClasses.join(' ')}>
        <div className={'left-margin'}></div>
        <div className={'main-text-content'}>{getParagraphs(edition).map((p, i) => <ParagraphComponent p={p}
                                                                                                       key={i}/>)}</div>
        <div className={'right-margin'}></div>
      </div>
    </div>
  );
}