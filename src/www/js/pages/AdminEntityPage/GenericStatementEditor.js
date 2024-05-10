import { ConfirmDialog } from '../common/ConfirmDialog'
import { OptionsChecker } from '@thomas-inst/optionschecker'
import { urlGen } from '../common/SiteUrlGen'

export class GenericStatementEditor {
  constructor(options) {
    let oc = new OptionsChecker({
      context: 'GenericStatementEditor',
      optionsDefinition: {
        subject: { type: 'number', required: true },
        predicate: { type: 'number', required: true },
        relation: { type: 'boolean', required: true },
        object: { type: 'string', default: null},
      }
    });

    this.options = oc.getCleanOptions(options);

    this.dialog = new ConfirmDialog({
      acceptButtonLabel: 'Save',
      title: 'Edit Statement',
      body: this.getBodyHtml(),
      hideOnAccept: false,
    })
    this.objectInput = $(`${this.dialog.getSelector()} .object-input`);
    this.editorialNoteInput = $(`${this.dialog.getSelector()} .editorial-note`);
    this.dialog.setAcceptFunction(this.genAcceptFunction());
    this.dialog.show();
  }

  genAcceptFunction() {
    return () => {
      console.log(`Click on accept `)
      let newObject = this.objectInput.val();
      if (newObject === undefined || newObject === '') {
        return;
      }

      if (this.options.relation) {
        console.log(`Saving new object ${parseInt(newObject.toString())}`);
      } else {
        console.log(`Saving new value '${newObject}', note '${this.editorialNoteInput.val().toString()}'`);
        let postData = [ {
          command: 'create',
          subject: this.options.subject,
          predicate: this.options.predicate,
          object:  newObject.toString(),
          editorialNote: this.editorialNoteInput.val().toString()
        }]
        $.post(urlGen.apiEntityStatementsEdit(), JSON.stringify(postData)).then( (response) => {
          console.log("Success", response);
        }).catch( (response) => {
          console.error("Failure", response);
        })
      }



    }
  }

  getBodyHtml() {
    return `<p>Subject: ${this.options.subject}</p>
        <p>Predicate: ${this.options.predicate}</p>
        <p>Object: <input type="text" class="object-input"></p>
        <p>Editorial Note: <input type="text" class="editorial-note"></p>
`

  }


}