import {createRoot} from "react-dom/client";
import 'bootstrap/dist/css/bootstrap.min.css';
import "./overlays.css";
import ClassOverlay from "@/ReactAPM/Components/ClassOverlay/ClassOverlay";
import {Fragment} from "react";


function Overlays() {


  const myRichText = (someText: string, words: string[]) => {
    const occurrences: Record<string, number> = {};

    return <div className="my-rich-text">
      {someText.split(' ').map((word, index) => {
        if (words.includes(word)) {
          occurrences[word] = (occurrences[word] || 0) + 1;
          return <Fragment key={index}><span className={`word word-${word}-${occurrences[word]}`}>{word}</span>{' '}
          </Fragment>;
        }
        return <Fragment key={index}>{word} </Fragment>;
      })}
    </div>;
  };

  const myWords = ['cat', 'dog', 'pig'];

  const makeSomeText = (myWords: string[]) => {
    const fillerWords = `the quick brown fox jumps over the lazy fence while a curious bird watches from the quiet garden and a small traveler wanders nearby
      the morning light settles across the old street as people carry books and music fills the open windows
      every careful step reveals another bright detail in the changing landscape around the peaceful town`.split(/\s+/);
    const occurrences = myWords.map(() => Math.floor(Math.random() * 6) + 5);
    const textWords = Array.from(
      {length: 1000 - occurrences.reduce((total, count) => total + count, 0)},
      () => fillerWords[Math.floor(Math.random() * fillerWords.length)],
    );

    myWords.forEach((word, wordIndex) => {
      for (let occurrence = 0; occurrence < occurrences[wordIndex]; occurrence++) {
        const insertionIndex = Math.floor(Math.random() * (textWords.length + 1));
        textWords.splice(insertionIndex, 0, word);
      }
    });

    return textWords.join(' ');
  };


  const getOverlayContent = (id: string | null) => {
    if (id === null)
      return null;

    const [word, occurrence] = id.split('-');

    return <div className="my-popover">
      <div className="header">
        {word}
      </div>
      <div className="body">
        <p>This is the occurrence number <b>{occurrence}</b> of the word '{word}' in the text.</p>
      </div>
    </div>
      ;
  };

  return (
    <div className={'outer-container'}>
      <h1>Normal text</h1>
      <ClassOverlay getOverlayContent={getOverlayContent} baseClassName={'word'} trigger={'hover'}>
        {myRichText(makeSomeText(myWords), myWords)}
      </ClassOverlay>

      <h2>With a table</h2>
      <ClassOverlay getOverlayContent={getOverlayContent} baseClassName={'word'}>
        <table>
          <thead>
          <tr>
            <th>N</th>
            <th>Word</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td>1</td>
            <td>word</td>
          </tr>
          <tr>
            <td>2</td>
            <td className={'word word-A-1'}>Word A</td>
          </tr>
          <tr>
            <td>3</td>
            <td>word</td>
          </tr>
          <tr>
            <td>4</td>
            <td>word</td>
          </tr>
          <tr>
            <td>2</td>
            <td className={'word word-A-2'}>Word A</td>
          </tr>
          </tbody>
        </table>
      </ClassOverlay>
    </div>
  );
}


const root = createRoot(document.getElementById("app")!);

root.render(<Overlays/>);