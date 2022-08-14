
import { FmtTextFactory } from '../../../js/FmtText/FmtTextFactory.mjs'
import { HtmlRenderer } from '../../../js/FmtText/Renderer/HtmlRenderer'
import { FmtTextTokenFactory } from '../../../js/FmtText/FmtTextTokenFactory.mjs'

$( () => {

  let testAreaDiv = $('#test-area')
  let testSuite = [
    {
      title: 'Simple String',
      testString: 'This is a test string. It should work all right.',
      rendererOptions: {}
    },
    {
      title: 'Some formatting',
      testString: [
        'This is a test ',
        FmtTextTokenFactory.normalText('some bold').setBold(),
        ' and ' ,
        FmtTextTokenFactory.normalText('some italics').setItalic()
      ],
      rendererOptions: {}
    },
    {
      title: 'Super',
      testString: [
        'E = mc', FmtTextTokenFactory.normalText('2').setSuperScript(),
        ' ... pay attention to the superscript: ',
        'E = mc', FmtTextTokenFactory.normalText('2').setSuperScript().setBold()
      ]
    },
    {
      title: 'Sub',
      testString: [
        'Water = H', FmtTextTokenFactory.normalText('2').setSubScript(),
        'O'
      ],
      rendererOptions: { tokenClasses: [], glueClasses: [], textClasses: [], tokenIndexClassPrefix: ''}
    },
  ]
  executeTestSuite(testAreaDiv, testSuite)

})

function executeTestSuite(testAreaDiv, testSuite) {

  testSuite.forEach( (testSpec, i) => {
    let testFmtText = FmtTextFactory.fromAnything(testSpec.testString)
    let renderer = new HtmlRenderer(testSpec.rendererOptions)
    testAreaDiv.append(`<h3>${testSpec.title}</h3><div class="test-div test-div-${i}">${renderer.render(testFmtText)}</div>`)
  })
}