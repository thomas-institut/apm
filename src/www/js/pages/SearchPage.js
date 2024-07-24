import { wait } from '../toolbox/FunctionUtil.mjs'
import { LanguageDetector } from '../toolbox/LanguageDetector.mjs'
import { urlGen } from './common/SiteUrlGen'
import { NormalPage } from './NormalPage'
import { tr } from './common/SiteLang'

let data_for_zooming = []

const STATE_INIT = 0
const STATE_WAITING_FOR_SERVER = 1
const STATE_DISPLAYING_RESULTS = 2

let state = STATE_INIT

const spinnerHtml = '<div class="spinner-border" role="status"></div>'



export class SearchPage extends NormalPage {

  constructor (options) {
    super(options)

    this.initPage().then( () => {
      console.log(`Search Page initialized`);
    })
  }

  async initPage () {
    await super.initPage();
    document.title = tr('Search');
    setupSearchPage();
  }

  async genContentHtml() {
    return `    <h1> Search </h1>

  <br>
  <table class="docTable dataTable" id="searchTable">
    <tr>
        <th class="text-center"><span title="Choose transcriptions (T) or editions (E) as the target corpus of your search.">Corpus</span></th>
        <th><span title="Enter words to search. You can use the wildcard '*' to search for words with a specific part, like 'philosoph*', '*losophus' or '*soph*'.">Keywords</span></th>
        <th id="doc-or-edition"><span title="Choose a specific document to search">Document</span></th>
        <th id="transcriber-or-editor"><span title="Limit your search to transcriptions by a specific transcriber.">Transcriber</span></th>
        <th style="text-align: center"><span title="Number of tokens, i. e. words or punctuation marks, that are allowed to occur between your first keyword and the following ones. A value of 0 means that only the occurrence of directly consecutive keywords counts as a match.">Keyword Distance</span></th>
        <th class="text-center"><span title="If checked, all conjugated or declined forms of your keywords will count as matches.">Lemmatization</span></th>
    </tr>
    <tr>
        <td>
            <div id="corpus-select" class="text-center">
                <select name="corpus-select" id="corpus-select" style="border: 0; background-color: white; padding: unset; -webkit-appearance: none">
                <option value="transcriptions">T</option>
                <option value="editions">E</option>
            </select>
            </div>
        </td>
        <td>
            <div id="search_form">
            <label for="keywordBox"></label>
            <input type="text" id="keywordBox" placeholder="" style="padding: unset">
            </div>
        </td>
        <td>
          <div id="doc_form">
            <label for="titleBox"></label>
            <input list="titleList" id="titleBox" placeholder="" autocomplete="off" style="padding: unset">
            <datalist id="titleList">
            </datalist>
          </div>
        </td>
        <td>
          <div id="transcriber_form">
            <label for="creatorBox"></label>
            <input list="creatorList" id="creatorBox" placeholder="" autocomplete="off" style="padding: unset">
            <datalist id="creatorList">
            </datalist>
          </div>
        </td>
      <td style="text-align: center">
        <form>
          <label for="keywordDistanceValue"></label>
          <input type="number" id="keywordDistanceValue" name="keywordDistanceValue" min="0" max="80" value="10" style="padding: unset">
        </form>
      </td>
      <td>
        <div class="text-center">
          <input type="checkbox" label="lemmatize" id="lemmatize" name="lemmatize" style="padding: unset">
        </div>
      </td>
      <td>
        <button type="submit" class="btn btn-primary" label="Search" id="searchButton" name="Search">Search</button>
      </td>
    </tr>
</table>

  <div id="error_message">
  </div>

  <div id="spinner" class="text-muted" style="margin: 20px; text-align: center;">
  </div>

    <div id="noMatchesDiv">
    </div>

    <table class="doctable dataTable no-footer" id="resultsTable">
        <thead></thead>
        <tbody></tbody>
    </table>

    <p></p>`
  }
}


window.SearchPage = SearchPage;


export function setupSearchPage() {

  // Get selectors for catching user input
  let keywords_box = $("#keywordBox")
  let lemmatization_box = $("#lemmatize")
  let corpus_selector = $("#corpus-select")

  // Get selector for signaling errors to user
  let errorMessageDiv = $("#error_message")

  // Get lists for creator and title forms
  getCreatorsAndTitles ('transcriptions', errorMessageDiv)
  getCreatorsAndTitles ('transcribers', errorMessageDiv)

  // Start query when the search button is pressed
  $("#searchButton").on("click", function () {

    if (state !== STATE_INIT) {
      console.log(`Search button clicked while searching or processing results. Nothing to do. State = ${state}`)
      return
    }

    // Get all relevant information for the query
    let user_input = keywords_box.val()

    // Query only if there is a given user input in the keywords field
    if (user_input !== "") {
      search()
    }
    else {
      errorMessageDiv.html(`<br>Please type in a keyword!<br><br>`)
    }
  })

  // Return an error message, if wildcards are combined with lemmatization
  lemmatization_box.on("click",  function (event) {
    let checked = lemmatization_box.prop("checked")
    let user_input = keywords_box.val()
    if (checked && user_input.includes("*")) {
      errorMessageDiv.html(`You cannot use wildcards (*) combined with lemmatization`)
    } else {
      errorMessageDiv.html('')
    }
  })

  keywords_box.on("keyup",  function (event) {
    let checked = lemmatization_box.prop("checked")
    let user_input = keywords_box.val()
    if (checked && user_input.includes("*")) {
      errorMessageDiv.html(`You cannot use wildcards (*) combined with lemmatization`)
    } else {
      errorMessageDiv.html('')
    }
  })

  // Adjust search form and creator/title lists to selected corpus
  corpus_selector.on("change",function (){
    let doc_or_edition = $("#doc-or-edition")
    let trans_or_editor = $("#transcriber-or-editor")

    // Clear title and creator lists
    $('#titleList').empty()
    $('#creatorList').empty()

    console.log(`corpus of the query was changed to ${$(this).find(":selected").val()}`)

    if ($(this).find(":selected").val() === 'transcriptions') {
      doc_or_edition.text("Document")
      trans_or_editor.text("Transcriber")

      // Get lists for transcription and transcriber forms
      getCreatorsAndTitles ('transcriptions', errorMessageDiv)
      getCreatorsAndTitles ('transcribers', errorMessageDiv)
    }
    else {
      doc_or_edition.text("Edition Title")
      trans_or_editor.text("Editor")

      // Get lists for edition and editor forms
      getCreatorsAndTitles ('editions', errorMessageDiv)
      getCreatorsAndTitles ('editors', errorMessageDiv)
    }
  })
}


// Function to get list of indexed values, i.e. titles or transcribers, via an API call
function getCreatorsAndTitles(category, errorMessageDiv) {

  let apiUrl = ''
  let listSelector = ''

  if (category === 'transcriptions') {
    apiUrl = urlGen.apiSearchTranscriptionTitles()
    listSelector = '#titleList'
  }
  else if (category === 'transcribers') {
    apiUrl = urlGen.apiSearchTranscribers()
    listSelector = '#creatorList'
  }
  else if (category === 'editors') {
    apiUrl = urlGen.apiSearchEditors()
    listSelector = '#creatorList'
  }
  else if (category === 'editions') {
    apiUrl = urlGen.apiSearchEditionTitles()
    listSelector = '#titleList'
  }

  // Make API request
  $.post(apiUrl).done((apiResponse) => {
    // Get list selector and clear the list
    let list = $(listSelector);
    list.empty();

    // Catch errors
    if (apiResponse.status !== 'OK') {
      console.log(`Error in query for ${category}!`);
      if (apiResponse.errorData !== undefined) {
        console.log(apiResponse.errorData);
      }
      errorMessageDiv.html(`Error while getting ${category} list, please report to technical administrators.`)
        .removeClass('text-error');
      return;
    }

    console.log(apiResponse);

    // Get items from apiResponse
    let items = apiResponse[category];

    // Fill list with item names
    items.forEach((item) => { list.append(`<option>${item}</option>`); });
  });
}

// Function to query the OpenSearch index
function search() {

  let p = new SimpleProfiler('search')

  // Clear data_for_zooming
  data_for_zooming = []

  // Get searched text, its language and the target corpus
  let ld = new LanguageDetector({ defaultLang: 'la'})
  let searchText = $("#keywordBox").val()
  let detectedLang = ld.detectLang(searchText)
  let corpus = $("#corpus-select").find(":selected").val()

  console.log(`Detected language for '${searchText}' is '${detectedLang}'`)

  // User inputs
  const inputs = {
    corpus: corpus,
    searched_phrase: searchText,
    lang: detectedLang,
    title: $("#titleBox").val(),
    creator: $("#creatorBox").val(),
    keywordDistance: parseInt($("#keywordDistanceValue").val()) + 1,
    zoom: $("#zoomValue").val(),
    lemmatize: $("#lemmatize").prop("checked")
  };

  // Selectors
  const spinner = $("#spinner");
  const resultsBody = $("#resultsTable tbody");
  const resultsHead = $("#resultsTable thead");
  const errorMessage = $("#error_message");

  // Clear results table and error message
  resultsBody.html('');
  resultsHead.html('');
  errorMessage.html('');

  // Show spinner
  spinner.html(`<span style="font-size: 2em">Getting results from server</span> ${spinnerHtml}`);

  state = STATE_WAITING_FOR_SERVER

  // Make API Call
  $.post(urlGen.apiSearchKeyword(), inputs)
    .done((apiResponse) => {

      // Catch Error
      if (apiResponse.status !== 'OK') {
        console.log(`Error in query`);
        if (apiResponse.errorData !== undefined) {
          console.log(apiResponse.errorData);
        }
        errorMessage.html('Error while searching, please report to technical administrators.').removeClass('text-error');
        state = STATE_INIT
        return;
      }

      p.lap('Got results from server')

      // Log API response
      console.log(apiResponse);

      // Remove spinner
      spinner.empty();

      // Make array to store zoom data in – default zoom values are dependent on the keyword distance values
      let zoom = new Array(apiResponse.num_passages_cropped+1).fill(inputs.keywordDistance)

      // Display results
      state = STATE_DISPLAYING_RESULTS
      displayResults(apiResponse.data, apiResponse.lang, apiResponse.num_passages_cropped, zoom, inputs.keywordDistance, apiResponse.num_passages_total, apiResponse.cropped, corpus).then( () => {
        p.stop('Results displayed')
        state = STATE_INIT
      })

    })
    .fail((status) => {
      console.log(status);
      spinner.empty();
      errorMessage.html('Search is currently not available. Please try again later.').removeClass('text-error');
    });
}


// Function to collect and display the search results in a readable form
async function displayResults (data, lang, num_passages, zoom, keywordDistance, num_passages_total, cropped, corpus) {

  // Get selectors for displaying results
  let results_body = $("#resultsTable tbody")
  let results_head = $("#resultsTable thead")
  let error_message = $("#error_message")
  const spinner = $("#spinner");

  // Count matches and titles
  let num_matches = data.length // means matches in the open-search index, not identical to num_passages
  let num_titles = getNumTitles(data, num_matches)

  // If there are no matches, display this to the user and empty the results table
  if (num_passages === 0) {
    results_head.empty()
    results_body.empty()
    error_message.html(`<br>Nothing found!<br><br>`)
  }

  else {

    // Make table head
    if (corpus === 'transcriptions') { // For transcriptions
      results_head.empty()
      results_head.append(`<tr><th><span title="Passages can overlap, if a keyword occurs multiple times inside the chosen keyword distance.">Matched Passage (${num_passages})</span></th><th><span title="Number of tokens, i. e. words or punctuation marks, to display before and after your first keyword. A value of 0 means that only the tokens matching your first keyword are displayed."><label for="zoomGlobal"></label><input type="number" id="zoomGlobal" name="zoomGlobal" min="0" max="80" value=${zoom[0]}></span>
                                </th><th>Document (${num_titles})</th><th>Foliation</th><th>Transcriber</th><th>Link</th></tr>`)
    }
    else { // For editions
      results_head.empty()
      results_head.append(`<tr><th>Matched Passage (${num_passages})</th><th><span title="Number of tokens, i. e. words or punctuation marks, to display before and after your first keyword. A value of 0 means that only the tokens matching your first keyword are displayed."><label for="zoomGlobal"></label><input type="number" id="zoomGlobal" name="zoomGlobal" min="0" max="80" value=${zoom[0]}></span>
                                </th><th>Edition (${num_titles})</th><th>Chunk</th><th>Editor</th><th>Link</th></tr>`)
    }
    results_body.empty()

    // Make variable for storing title of previous column in the dataset to display only the title only once,
    // if there are plenty matched columns/passages in the same work
    let prev_title = ' '
    let k=0

    spinner.html(`Processing result ${k} of ${num_passages} (${(100*(k+1)/num_passages).toFixed(0)}%)`)
    await wait(1)

    // Write all matches into the results table
    for (let i = 0; i < num_matches; i++) {

      // Collect relevant Data from API response
      let title = data[i]['title']
      let tokens_matched = data[i]['tokens_matched']
      let passages = data[i]['passage_tokenized']
      let positions = data[i]['positions']
      let text_tokenized = data[i]['text_tokenized']
      let creator = data[i]['creator']

      let foliation
      let seq
      let docID
      let column
      let table_id
      let chunk
      let link

      if (corpus === 'transcriptions') {
        seq = data[i]['seq']
        foliation = data[i]['foliation']
        docID = data[i]['docID']
        column = data[i]['column']
        link = getLink(urlGen.sitePageView(docID, seq, column))
      }
      else {
        table_id = data[i]['table_id']
        chunk = data[i]['chunk']
        link = getLink(urlGen.siteCollationTableEdit(table_id))
      }

      // Slice and highlight passages
      for (let j = 0; j < passages.length; j++) {
        k=k+1
        if (k % 100 === 0) {
          spinner.html(`Processing result ${k} of ${num_passages} (${(100*(k+1)/num_passages).toFixed(0)}%)`)
          await wait(1)
        }

        // Save data for zooming
        data_for_zooming.push({
          'text_tokenized': text_tokenized,
          'tokens_matched': tokens_matched,
          'position': positions[j]})

        let passage = sliceAndHighlight(text_tokenized, tokens_matched, positions[j], keywordDistance, zoom[k])

        // Fill table with results
        if (corpus === 'transcriptions') {
          fillResultsTable(passage, title, foliation, creator, link, lang, zoom, prev_title, k)
        }
        else {
          fillResultsTable(passage, title, chunk, creator, link, lang, zoom, prev_title, k)
        }
        prev_title = title
      }
    }

    // Signal cropping of search results to the user
    if (cropped) {
      error_message.html(`<br>Too many matches! Showing only ${num_passages} of ${num_passages_total} matched passages. <br>Specify your query or contact the administrators.<br><br>`)
    }

    // Implement zoom handling
    let zoom_global = $("#zoomGlobal")
    let cancelled = false
    $(zoom_global).off('change').on("change",  async (event)=> {
      if (state !== STATE_INIT) {
        console.log(`Global zoom clicked while state = ${state}, nothing to do`)
        return
      }

      for (let i=1; i<(num_passages+1); i++) {
        if (state !== STATE_INIT) {
          // if state has changed, cancel current update
          cancelled = true
          break
        }
        if (i % 100 === 0) {
          spinner.html(`Updating zoom level for result ${i} of ${num_passages}`)
          await wait(1)
        }
        let name = "#zoomValue" + i
        let value = zoom_global.val()
        $(name).prop("value", value)
        let zoom_slider = $(name)
        let keywordDistance_slider = $("#keywordDistanceValue")
        let index = name.match(/\d/g);
        index = index.join("");
        zoom[index] = zoom_slider.val()
        let keywordDistance = parseInt(keywordDistance_slider.val()) + 1
        updateResults(data_for_zooming, zoom, keywordDistance, index)
      }
      spinner.html('')
    })
    if (!cancelled) {
      // if not cancelled, finish properly!
      spinner.html('')
      // if cancelled, this function should not mess up the display
    }
  }
}

// Function to update search results when user is zooming
function updateResults (data, zoom, keywordDistance, index) {

  // Get selector for updating results
  let results_body = document.getElementById("resultsTable")

  // Get the relevant data
  let tokens_matched = data[index-1]['tokens_matched']
  let text_tokenized = data[index-1]['text_tokenized']
  let position = data[index-1]['position']

  // Slice and highlight passage
  let passage = sliceAndHighlight(text_tokenized, tokens_matched, position, keywordDistance, zoom[index])
  results_body.rows[index].cells[0].innerHTML = passage;
}

// Function to add a link to a string in html
function getLink (url) {
  return `<a class="fas fa-external-link-alt" corpus="_blank" href=${url} </a>`;
}

// Function to calculate total number of matched documents
function getNumTitles (data, numColumns) {

  let num_titles = 0
  let prev_title = ""

  for (let i=0; i<numColumns; i++) {
    let title = data[i]['title']
    if (title !== prev_title) {
      num_titles = num_titles + 1
    }
    prev_title = title
  }

  return num_titles
}

// Function to slice passages out of a text depending on zoom value
// and highlight the searched keywords in the passages depending on keywordDistance value
function sliceAndHighlight (text, tokens_matched, position, keywordDistance, zoom) {

  // SLICE
  let text_len = text.length
  let passage_start = position-zoom
  let passage_end = parseInt(position)+parseInt(zoom)+1

  if (passage_start < 0) {
    passage_start = 0
  }

  if (passage_end > (text_len-1)) {
    passage_end = text_len
  }

  let passage = text.slice(passage_start, passage_end)

  // HIGHLIGHT
  let passage_highlighted = ""

  // Convert array to string with bold tokens_matched
  for (let i=0; i<passage.length; i++) {
    // Get current word of passage-array
    let token = passage[i]
    // Highlight token, if it is one of the tokens_matched and inside the search keywordDistance, not the zoom (!) keywordDistance
    if (tokens_matched.indexOf(token) !== -1 && insideKeywordDistance(i+passage_start, position, keywordDistance)) {
      token = "<mark>" + token + "</mark>"
    }
    // Append token to returned string
    passage_highlighted = passage_highlighted + token + " "
  }

  return removeBlanks(passage_highlighted)
}

// Function to check if a matched keyword is inside the search keywordDistance
function insideKeywordDistance (index, position, keywordDistance) {

  let distance = Math.abs(index-position)
  if (distance>keywordDistance) {
    return false
  }
  else {
    return true
  }
}

// Function to remove inadequate blanks from passage
function removeBlanks (text) {
  text = text.replaceAll(" .", ".")
  text = text.replaceAll(" ,", ",")
  text = text.replaceAll(" :", ":")
  text = text.replaceAll("[ ", "[")
  text = text.replaceAll(" ]", "]")

  return text
}

function fillResultsTable(passage, title, identifier, transcriber, link, lang, zoom, prev_title=' ', k) {

  // Get selector
  let results_body = $("#resultsTable tbody")

  // Don't write title into the results table, if it is identical to the title of the previous passage
  if (title === prev_title) {

    if (lang==='la') {
      results_body.append(
        `<tr><td class="text-la" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td class="text-center">${identifier}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    }
    else if (lang==='he') {
      results_body.append(
        `<tr><td class="text-he" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td class="text-center">${identifier}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    }
    else if (lang==='ar') {
      results_body.append(
        `<tr><td class="text-ar" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td class="text-center">${identifier}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    }
  }

  else {
    if (lang === 'la') {
      results_body.append(
        `<tr><td class="text-la" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td class="text-center">${identifier}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    } else if (lang === 'he') {
      results_body.append(
        `<tr><td class="text-he" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td class="text-center">${identifier}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    } else if (lang === 'ar') {
      results_body.append(
        `<tr><td class="text-ar" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td class="text-center">${identifier}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    }
  }

  // Implement zoom handling
  for (let i=1; i<(k+1); i++) {
    let name = "#zoomValue" + i
    $(name).on("change", function (event) {
      let zoom_slider = $(name)
      let keywordDistance_slider = $("#keywordDistanceValue")
      let index = name.match(/\d/g);
      index = index.join("");
      zoom[index] = zoom_slider.val()
      let keywordDistance = parseInt(keywordDistance_slider.val()) + 1
      updateResults(data_for_zooming, zoom, keywordDistance, index)
    })
  }

  return true
}