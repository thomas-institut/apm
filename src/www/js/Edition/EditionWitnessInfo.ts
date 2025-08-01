


export class EditionWitnessInfo {

  siglum: string = '';
  title: string = '';

  setSiglum(siglum: string): this {
    this.siglum = siglum
    return this
  }

  setTitle(title: string): this {
    this.title = title
    return this
  }

}