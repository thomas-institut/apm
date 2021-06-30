
/*

Minimal data structure for a critical edition

 Edition := {
     ... optional general Id info, e.g. title, etc....

     // An edition's main text is  tree of main text sections with MainTextToken at farthest leaves.
     // The simplest case will have just one section with MainTextTokens
     // The idea is that entries in the apparatus will be associated with main text tokens from
     // a particular section, so that partial texts (like chunks) can can be put together into
     // a bigger edition.
     // Any section in this tree can be uniquely identified by an array of indexes
     //   e.g. [0, 0], the first subsection of the first main text section
     mainText : MainTextSection[]
     apparatuses:  Apparatus[]
     witnesses:  EditionWitnessInfo[]

     ... eventually also:  information on how to order and display witnesses, e.g. witness groups
 }

MainTextSection := {
    id: string, some identifying name, e.g. to associate it with a specific collation table
    style: string,
    type: 'normal', 'multi-column', etc  .... for the time being only normal
    breakAfter:  none | paragraph | space | column | page
    spaceAfter:  px/pt/em
    breakBefore: none | paragraph | space | column | page
    spaceBefore: px/pt/em
    subSections: MainTextSection[]
    text: MainTextToken[]    // need to determine what to do with a section that has both subSections and text
                             // For now, just stipulate that if there subsections the text is ignored so
                             // basically a node in the main text tree can be either a subtree of sections or an
                             // end node with text
}

EditionWitnessInfo := {
  siglum: string,
  title: string (optional)
  ... other info that specific viewer might want to display ...
}

MainTextToken := {
    type: text | space/glue | possibly others like marks for marginal information, ref
    fmtText:  FmtText

    ... other info needed for specialized representations, e.g. normalization, simpleText

    ctColumn: int, an index into a collation table
        Normally, the main text will be generated out of a witness in a collation table which also will
        be used to generate an automatic critical apparatus. This field allows for the two data structures
        to be put together
}

Apparatus :=   {
    type: string constant, e.g. 'criticus', 'fontium', etc
    entries: ApparatusEntry[]
    ... perhaps other data depending on the apparatus type
}

ApparatusEntry  := {
     section:  int[], an index into the mainText tree
          e.g. [ 0 ], the first and only section in the main text
               [1, 3], the 4th  section of the 2nd main section

     from: int, index to the MainTextToken in the given section
     to: int, index to the MainTextToken in the given section
     lemma: string, can be derived from (mainText, from, to), but the editor could override it  (TODO: how to do this in UI?)
     subEntries:  ApparatusSubEntry[]
}

ApparatusSubEntry := {
      type: string constant, e.g. 'variant', 'addition', 'custom'
      fmtText:  FmtText, e.g. the actual variant (or anything that can be converted to fmtText, e.g., a simple string)
      witnessData: SubEntryWitnessInfo[], info about the witnesses associated with the entry, e.g., the witnesses in which the variant is present
      ... other things depending on the sub-entry type
     // the idea is that the edition viewer or typesetter will generate the actual formatted text for presentation
     // out of the given fmtText and the witnessData.  However, it should be possible to override
     // that mechanism and provide a custom-made sub-entry text with the required formatting.

SubEntryWitnessInfo := {
     witnessIndex : integer
     ... basically all the pertinent info from the transcription token, but the user could override it for this particular collation table....
     hand:  integer
     location: string constant representing where the phenomenon is located, e.g. margin-right, overline
     technique: string constant, e.g. points-above, a deletion technique

 */


import { MainTextSection } from './MainTextSection'

export class Edition {

  constructor () {

    this.lang = ''
    this.infoText = 'Empty Edition'
    this.info = {}
    /**
     *
     * @member {MainTextSection[]}
     */
    this.mainTextSections = []
    /**
     *
     * @member {Apparatus[]}
     */
    this.apparatuses = []

    /**
     *
     * @member {EditionWitnessInfo[]}
     */
    this.witnesses = []
  }

  /**
   *
   * @param {MainTextSection[]} mainTextSectionArray
   */
  setMainText(mainTextSectionArray) {
    this.mainTextSections = mainTextSectionArray
    return this
  }

  setLang(lang) {
    this.lang = lang
    return this
  }

  getLang() {
    return this.lang
  }

  /**
   *
   * @param {MainTextToken[]} mainTextTokens
   */
  setSingleSectionFromMainTextTokens(mainTextTokens) {
    this.mainTextSections = [ new MainTextSection() ]
    this.mainTextSections[0].text = mainTextTokens
  }

  getSigla() {
    return this.witnesses.map( w => w.siglum)
  }

}

