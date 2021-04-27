import { MultiPanelUI}  from '../../../js/multi-panel-ui/MultiPanelUI'

function onResize(id, mode) {
  let thePanel = $(`#${id}`)
  thePanel.append(`<p>New size: ${thePanel.width()} x ${thePanel.height()}</p>`)
}

$( () => {
  let multiPanelUI = new MultiPanelUI({
    logo: `<img src="../../../images/apm-logo-plain.svg" alt="logo"/>`,
    panels: [
      {
        id: 'panel-one',
        content: (mode) => { return `Panel 1 in mode '${mode}'`},
        postRender: () => { console.log('Panel 1 rendered')},
        onResize: onResize
      },
      {
        id: 'panel-two',
        content: (mode) => { return `Panel 2 in mode '${mode}'`},
        postRender: () => { console.log('Panel 2 rendered')},
        onResize: onResize
      }
    ]
    }
  )
  multiPanelUI.start()
})