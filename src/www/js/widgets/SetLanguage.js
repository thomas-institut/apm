import { OptionsChecker } from '@thomas-inst/optionschecker'

export class SetLanguage {

  constructor(options) {
    const oc = new OptionsChecker({
      context: "SetLanguage",
      optionsDefinition: {
        containerSelector: { type: 'string'},
        defaultLanguage: { type: 'number' },
        onSetLanguage: { type: 'function' },
        buttonLabel: { type: 'string', default: "Set Language" },
        warningText: { type: 'string', default: "Are you sure you want to set the language?" },
        processingText: { type: 'string', default: "Setting language"},
      }
    })
  }

}