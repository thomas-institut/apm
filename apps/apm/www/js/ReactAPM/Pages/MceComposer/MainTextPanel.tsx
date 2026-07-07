import {Edition} from "@/Edition/Edition";
import {JSX} from "react";

interface MainTextPanelProps {
  edition: Edition | null;
  generationProgress: number | null;
}

export default function MainTextPanel({edition, generationProgress}: MainTextPanelProps) {


  let generationNotification: JSX.Element | null = null;


  const getText = (edition: Edition): string[] => {
    const paragraphs: string[] = [];

    let currentParagraph: string = "";
    edition.mainText.forEach( (token) => {
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
  }

  if (edition === null && generationProgress === null) {
    generationNotification = <div className={'waiting'}>Waiting for edition...</div>;
  } else {
    if (generationProgress !== null) {
      generationNotification = <div className={'out-of-date'}>Generation in progress...</div>;
    }
  }

  const mainTextClasses = [ 'main-text', 'text-' + edition?.lang];

  return (
    <div className={'main-text-panel'}>
      { generationNotification }
      { edition !== null && <div className={mainTextClasses.join(' ')}>
        <div className={'left-margin'}></div>
        <div>{getText(edition).map( p => <p>{p}</p>)}</div>
        <div className={'right-margin'}></div>
      </div>}
    </div>
  );
}