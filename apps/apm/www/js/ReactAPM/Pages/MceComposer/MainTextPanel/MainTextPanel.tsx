import {Edition} from "@/Edition/Edition";
import './MainTextPanel.css';
import {Button} from "react-bootstrap";

interface MainTextPanelProps {
  edition: Edition | null;
  generationProgress: number | null;
  editionOutOfDate: boolean;
  onClickRegenerate: () => void;
}

export default function MainTextPanel({
                                        edition,
                                        generationProgress,
                                        editionOutOfDate,
                                        onClickRegenerate
                                      }: MainTextPanelProps) {

  const getText = (edition: Edition): string[] => {
    const paragraphs: string[] = [];

    let currentParagraph: string = "";
    edition.mainText.forEach((token) => {
      switch (token.type) {
        case 'text':
        case 'glue':
          currentParagraph += token.getPlainText();
          break;
        case 'paragraph_end':
          paragraphs.push(currentParagraph);
          currentParagraph = "";
          break;
      }
    });
    if (currentParagraph !== "") {
      paragraphs.push(currentParagraph);
    }

    return paragraphs;
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
        <div>{getText(edition).map((p, i) => <p key={i}>{p}</p>)}</div>
        <div className={'right-margin'}></div>
      </div>
    </div>
  );
}