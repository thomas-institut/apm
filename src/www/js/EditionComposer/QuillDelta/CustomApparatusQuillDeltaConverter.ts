import { GenericQuillDeltaConverter } from './GenericQuillDeltaConverter'
import {QuillDelta} from "@/lib/types/Quill";

export class CustomApparatusQuillDeltaConverter  {
  static toFmtText(quillDelta: QuillDelta, debug = true) {
    let converter = new GenericQuillDeltaConverter({
      debug: debug,
      ignoreParagraphs: true,
      attrToClassTranslators: {
        sigla: (value, classList) => {
          if (value) {
            classList = 'sigla'
          }
          return classList
        }
      }
    })

    return converter.toFmtText(quillDelta)
  }
}