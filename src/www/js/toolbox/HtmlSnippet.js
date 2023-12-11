



export class HtmlSnippet {


  static loadingDataMessage(msg) {
    return `<div class="text-muted" style="margin: 20px;">
        <p>${msg}</p>
        <div class="spinner-grow" role="status">
            <span class="sr-only">${msg}</span>
        </div>
    </div>`
  }
}