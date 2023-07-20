import { wait } from '../toolbox/FunctionUtil.mjs'
import { LanguageDetector } from '../toolbox/LanguageDetector.mjs'

let urlGen = new ApmUrlGenerator('')
let data_for_zooming = []
let searching = false

const STATE_INIT = 0
const STATE_WAITING_FOR_SERVER = 1
const STATE_DISPLAYING_RESULTS = 2


let state = STATE_INIT

const spinnerHtml = '<div class="spinner-border" role="status"></div>'


export function setupSearchPage(baseUrl) {

  urlGen.setBase(baseUrl)
  // Get selectors for catching user input
  let keywords_box = $("#keywordBox")
  let lemmatization_box = $("#lemmatize")
  let corpus_selector = $("#corpus-select")

  // Get selector for signaling errors to user
  let errorMessageDiv = $("#error_message")

  // Get lists for transcript and transcriber forms
  getListFromOpenSearch ('titles', errorMessageDiv)
  getListFromOpenSearch ('transcribers', errorMessageDiv)

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

  // Error message if wildcards are combined with lemmatization
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

  corpus_selector.on("change",function (){
    let doc_or_edition = $("#doc-or-edition")
    let trans_or_editor = $("#transcriber-or-editor")

    console.log(`corpus of the query was changed to ${$(this).find(":selected").val()}`)

    if ($(this).find(":selected").val() === 'transcriptions') {
      doc_or_edition.text("Document")
      trans_or_editor.text("Transcriber")

      // Get lists for transcript and transcriber forms
      getListFromOpenSearch ('titles', errorMessageDiv)
      getListFromOpenSearch ('transcribers', errorMessageDiv)
    }
    else {
      doc_or_edition.text("Edition")
      trans_or_editor.text("Editor")

      // Get lists for edition and editor forms
      //getListFromOpenSearch ('editions', errorMessageDiv)
      //getListFromOpenSearch ('editors', errorMessageDiv)
    }
  })
}

window.setupSearchPage = setupSearchPage

// Function to get list of indexed values, i.e. titles or transcribers, via an API call
function getListFromOpenSearch(category, errorMessageDiv) {
  let apiUrl = category === 'titles' ? urlGen.apiSearchTitles(): urlGen.apiSearchTranscribers();
  let listSelector = category === 'titles' ? '#titleList' : '#transcriberList';

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
    title: $("#transcriptBox").val(),
    transcriber: $("#transcriberBox").val(),
    radius: parseInt($("#radiusSlider").val()) + 1,
    zoom: $("#zoomSlider").val(),
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

      let zoom = new Array(apiResponse.num_passages_cropped+1).fill(inputs.radius)

      // Call displayResults-function and save backup of data for zoom handling

      state = STATE_DISPLAYING_RESULTS
      displayResults(apiResponse.data, apiResponse.lang, apiResponse.num_passages_cropped, zoom, inputs.radius, apiResponse.num_passages_total, apiResponse.cropped).then( () => {
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
async function displayResults (data, lang, num_passages, zoom, radius, num_passages_total, cropped) {

  // Get selectors for displaying results
  let results_body = $("#resultsTable tbody")
  let results_head = $("#resultsTable thead")
  let error_message = $("#error_message")
  const spinner = $("#spinner");

  // Count matched columns and docs
  let num_columns = data.length
  let num_docs = getNumDocs(data, num_columns)

  // If there are no matches, display this to the user and empty the results table
  if (num_passages === 0) {
    results_head.empty()
    results_body.empty()
    error_message.html(`<br>Nothing found!<br><br>`)
  }

  else {

    // Make table head
    results_head.empty()
    results_head.append(`<tr><th>Matched Passage (${num_passages})</th><th><span title="Number of tokens, i. e. words or punctuation marks, to display before and after your first keyword. A value of 0 means that only the tokens matching your first keyword are displayed."><label for="zoomGlobal"></label><input type="number" id="zoomGlobal" name="zoomGlobal" min="0" max="80" value=${zoom[0]}></span>
                                </th><th>Document (${num_docs})</th><th>Foliation</th><th>Transcriber</th><th>Link</th></tr>`)
    results_body.empty()

    // Make variable for storing title of previous column in the dataset to display only the title only once,
    // if there are plenty matched columns/passages in the same work
    let prev_title = ' '
    let k=0

    spinner.html(`Processing result ${k} of ${num_passages} (${(100*(k+1)/num_passages).toFixed(0)}%)`)
    await wait(1)

    // Write all matches into the results table
    for (let i = 0; i < num_columns; i++) {

      // Collect relevant Data from API response
      let title = data[i]['title']
      let seq = data[i]['seq']
      let foliation = data[i]['foliation']
      let column = data[i]['column']
      let transcriber = data[i]['transcriber']
      let tokens_matched = data[i]['tokens_matched']
      let passages = data[i]['passage_tokenized']
      let docID = data[i]['docID']
      let transcript_tokenized = data[i]['transcript_tokenized']
      let positions = data[i]['positions']

      // Get link for matched column
      let link = getLink(urlGen.sitePageView(docID, seq, column))

      // Slice and highlight passage
      for (let j = 0; j < passages.length; j++) {
        k=k+1
        if (k % 100 === 0) {
          spinner.html(`Processing result ${k} of ${num_passages} (${(100*(k+1)/num_passages).toFixed(0)}%)`)
          await wait(1)
        }

        data_for_zooming.push({
          'transcript_tokenized': transcript_tokenized,
          'tokens_matched': tokens_matched,
          'position': positions[j]})

        let passage = sliceAndHighlight(transcript_tokenized, tokens_matched, positions[j], radius, zoom[k])

        // Fill table with results - layout depends slightly on the language of the transcripts
        fillResultsTable(passage, title, foliation, transcriber, link, lang, zoom, prev_title, k)
        prev_title = title
        // await wait(1)
      }
    }

    if (cropped) {
      error_message.html(`<br>Too many matches! <br>Showing only ${num_passages} of ${num_passages_total} matched passages. <br>Specify your query or contact the administrators.<br><br>`)
    }

    // Zoom events
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
        let name = "#zoomSlider" + i
        let value = zoom_global.val()
        $(name).prop("value", value)
        let zoom_slider = $(name)
        let radius_slider = $("#radiusSlider")
        let index = name.match(/\d/g);
        index = index.join("");
        zoom[index] = zoom_slider.val()
        let radius = parseInt(radius_slider.val()) + 1
        updateResults(data_for_zooming, zoom, radius, index)
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
function updateResults (data, zoom, radius, index) {

  // Get selector for updating results
  let results_body = document.getElementById("resultsTable")

  // Get the relevant data
  let tokens_matched = data[index-1]['tokens_matched']
  let transcript_tokenized = data[index-1]['transcript_tokenized']
  let position = data[index-1]['position']

  // Slice and highlight passage
  let passage = sliceAndHighlight(transcript_tokenized, tokens_matched, position, radius, zoom[index])
  results_body.rows[index].cells[0].innerHTML = passage;
}

// Function to add a link to a string in html
function getLink (url) {
  return `<a class="fas fa-external-link-alt" corpus="_blank" href=${url} </a>`;
}

// Function to calculate total number of matched documents
function getNumDocs (data, numColumns) {

  let num_docs = 0
  let prev_title = ""

  for (let i=0; i<numColumns; i++) {
    let title = data[i]['title']
    if (title !== prev_title) {
      num_docs = num_docs + 1
    }
    prev_title = title
  }

  return num_docs
}

// Function to slice passages out of a transcript depending on zoom value
// and highlight the searched keywords in the passages depending on radius value
function sliceAndHighlight (transcript, tokens_matched, position, radius, zoom) {

  // SLICE
  let transcript_len = transcript.length
  let passage_start = position-zoom
  let passage_end = parseInt(position)+parseInt(zoom)+1

  if (passage_start < 0) {
    passage_start = 0
  }

  if (passage_end > (transcript_len-1)) {
    passage_end = transcript_len
  }

  let passage = transcript.slice(passage_start, passage_end)

  // HIGHLIGHT
  let passage_highlighted = ""

  // Convert array to string with bold tokens_matched
  for (let i=0; i<passage.length; i++) {
    // Get current word of passage-array
    let token = passage[i]
    // Highlight token, if it is one of the tokens_matched and inside the search radius, not the zoom (!) radius
    if (tokens_matched.indexOf(token) !== -1 && insideRadius(i+passage_start, position, radius)) {
      token = "<mark>" + token + "</mark>"
    }
    // Append token to returned string
    passage_highlighted = passage_highlighted + token + " "
  }

  return removeBlanks(passage_highlighted)
}

// Function to check if a matched keyword is inside the search radius
function insideRadius (index, position, radius) {

  let distance = Math.abs(index-position)
  if (distance>radius) {
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

function fillResultsTable(passage, title, foliation, transcriber, link, lang, zoom, prev_title=' ', k) {

  // Get selector
  let results_body = $("#resultsTable tbody")

  // Don't write title into the results table, if it is identical to the title of the previous passage
  if (title === prev_title) {

    if (lang==='la') {
      results_body.append(
        `<tr><td class="text-justify" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomSlider${k}"></label><input type="number" id="zoomSlider${k}" name="zoomSlider${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td class="text-center">${foliation}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    }
    else if (lang==='he') {
      results_body.append(
        `<tr><td class="text-justify" class="text-he" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomSlider${k}"></label><input type="number" id="zoomSlider${k}" name="zoomSlider${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td class="text-center">${foliation}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    }
    else if (lang==='ar') {
      results_body.append(
        `<tr><td class="text-justify" class="text-ar" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomSlider${k}"></label><input type="number" id="zoomSlider${k}" name="zoomSlider${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td class="text-center">${foliation}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    }
  }

  else {
    if (lang === 'la') {
      results_body.append(
        `<tr><td class="text-justify" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomSlider${k}"></label><input type="number" id="zoomSlider${k}" name="zoomSlider${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td class="text-center">${foliation}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    } else if (lang === 'he') {
      results_body.append(
        `<tr><td class="text-justify" class="text-he" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomSlider${k}"></label><input type="number" id="zoomSlider${k}" name="zoomSlider${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td class="text-center">${foliation}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    } else if (lang === 'ar') {
      results_body.append(
        `<tr><td class="text-justify" class="text-ar" style="width: 50em">${passage}</td><td style="text-align: right"><label for="zoomSlider${k}"></label><input type="number" id="zoomSlider${k}" name="zoomSlider${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td class="text-center">${foliation}</td><td>${transcriber}</td><td class="text-center">${link}</td></tr>`)
    }
  }




  for (let i=1; i<(k+1); i++) {
    let name = "#zoomSlider" + i
    $(name).on("change", function (event) {
      let zoom_slider = $(name)
      let radius_slider = $("#radiusSlider")
      let index = name.match(/\d/g);
      index = index.join("");
      zoom[index] = zoom_slider.val()
      let radius = parseInt(radius_slider.val()) + 1
      updateResults(data_for_zooming, zoom, radius, index)
    })
  }

  return true
}