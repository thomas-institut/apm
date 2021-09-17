import { EditionFreeTextEditor } from '../../../js/EditionComposer/EditionFreeTextEditor'
import { FmtTextFactory } from '../../../js/FmtText/FmtTextFactory'
import { HtmlRenderer } from '../../../js/FmtText/Renderer/HtmlRenderer'
import { FmtTextTokenFactory } from '../../../js/FmtText/FmtTextTokenFactory'

$( () => {


  let editor = new EditionFreeTextEditor({
     containerSelector: '#editor',
     lang: 'la',
     onChange: (v) => { reportContent(editor) },
     initialText: FmtTextFactory.fromAnything([ "This is a ", FmtTextTokenFactory.normalText("test").setBold() ,  "."]),
     debug: true
   })

  reportContent(editor)

})

function reportContent(editor) {
  let renderer = new HtmlRenderer({})
  let fmtText = editor.getFmtText()
  let html = renderer.render(fmtText)
  $('#delta').html(objToString(editor.getQuillDelta()))
  $('#fmt-text').html(objToString(fmtText))
  $('#contents').html(html)
}

function objToString(delta) {
  return JSON.stringify(delta)
}



