import { NormalPage } from './NormalPage'

export class PeoplePage extends NormalPage {

    constructor(options) {
        super(options)
        console.log(`People Page`)
        console.log(options)
        this.initPage().then( () => {
            console.log(`People page initialized`)
        })
    }

    async genHtml() {
        return `<h1>People Page</h1><p>Coming soon...</p>`
    }

}


window.PeoplePage = PeoplePage