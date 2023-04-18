export class CounterButton {
    constructor(selector) {
        this.container = $(selector)
        this.container.html(this.getHtml())
        this.button = $(`${selector} .counter`)
        this.count = 0
        this.updateButton()
        this.button.on('click', () => {
            this.count++
            this.updateButton()
        })
    }
    updateButton() {
        this.button.html(`The count is ${this.count}`)
    }

    /**
     * @private
     * @returns {string}
     */
    getHtml() {
        return `<button class="counter" type="button"></button>`
    }

}