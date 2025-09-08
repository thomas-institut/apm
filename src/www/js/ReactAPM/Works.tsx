import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {LoremIpsum} from "lorem-ipsum";

export default function Works() {

  const lorem = new LoremIpsum();
  lorem.format = 'html';
  return <NormalPageContainer><h1>Works</h1><div dangerouslySetInnerHTML={{__html: lorem.generateParagraphs(20)}}></div></NormalPageContainer>;
}