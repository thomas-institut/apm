import NormalPage from "./NormalPage";
import {LoremIpsum} from "lorem-ipsum";

export default function Works() {

  const lorem = new LoremIpsum();
  lorem.format = 'html';
  return <NormalPage><h1>Works</h1><div dangerouslySetInnerHTML={{__html: lorem.generateParagraphs(20)}}></div></NormalPage>;
}