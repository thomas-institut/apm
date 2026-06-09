import {MainTextToken} from "./MainTextToken.js";

export interface MainTextParagraph {
  type: string;
  tokens: MainTextToken[];
}