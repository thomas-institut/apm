import {LoremIpsum as LoremIpsumLib} from "lorem-ipsum";
import {useRef} from "react";
interface LoremIpsumProps {
  paragraphs?: number;
}
const lorem = new LoremIpsumLib();
lorem.format = 'html';

export default function LoremIpsumText(props: LoremIpsumProps){

  const html =useRef(lorem.generateParagraphs(props.paragraphs || 5));

  return <div dangerouslySetInnerHTML={{__html: html.current}}/>
}