import { LanguageDetector } from '../toolbox/LanguageDetector.mjs'
import { urlGen } from './common/SiteUrlGen'
import { NormalPage } from './NormalPage'
import { tr } from './common/SiteLang'

// global variables used for the display of the search results
let data_for_zooming = []
let zoom = [] // array to collect and continuously update the non-global zoom slider values in
let noPassageMatchedInTotal = true
let numDisplayedPassages = 0
let numDisplayedTitles = 0
let prevTitle = ''

// status constants
const STATE_INIT = 0
const STATE_WAITING_FOR_SERVER = 1
const STATE_DISPLAYING_RESULTS = 2

let state = STATE_INIT

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

  /**
   * generates the basic html structure
   * @returns {Promise<string>}
   */
  async genContentHtml() {
    return `    <h1> Search </h1>

  <br>
  <table class="docTable dataTable" id="searchTable">
<!--        <col width="10%" />-->
<!--        <col width="15%" />-->
<!--        <col width="15%" />-->
<!--        <col width="15%" />-->
<!--        <col width="15%" />-->
<!--        <col width="15%" />-->
<!--        <col width="5%" />-->
    <tr>
        <th><span title="Choose transcriptions or editions as the target corpus of your search.">Corpus</span></th>
        <th><span title="Enter words to search. You can use the wildcard '*' to search for words with a specific part, like 'philosoph*', '*losophus' or '*losoph*'. Be aware, that a wildcard requires at least one additional letter at the respective location of a word to count it as a match, e. g. searching for 'philosophi*' will not match the word 'philosophi'.">Keywords</span></th>
        <th id="doc-or-edition"><span title="Choose a specific document to search">Document</span></th>
        <th id="transcriber-or-editor"><span title="Limit your search to transcriptions by a specific transcriber.">Transcriber</span></th>
        <th style="text-align: center"><span title="Number of tokens, i. e. words or punctuation marks, that are allowed to occur between the longest given keyword and each of the others. Having two keywords a value of 0 means that only the occurrence of directly consecutive words counts as a match. Having three keywords a value of 0 means that only the occurrence of your longest keyword in the middle of the other two counts as a match. Having four keywords a value of 0 cannot deliver any matches, because at least one of the keywords will have the distance 1 from the longest given keyword. It is recommended not to use too low values for the keyword distance. This could result in overlooking possible matches.">Keyword Distance</span></th>
        <th class="text-center"><span title="If checked, conjugated or declined forms of your keywords will count as matches. Be aware, that automatic lemmatization is not an error-free process and therefore lemmatized search can return false positives and especially can miss some matches. In some scenarios it is recommended to make some checks with unlemmatized search for declined or conjugated forms of your keyword.">Lemmatization</span></th>
    </tr>
    <tr>
        <td>
            <div id="corpus-select">
                <select name="corpus-select" id="corpus-select" style="border: 0; background-color: white; padding: unset; -webkit-appearance: none">
                <option value="transcriptions">Transcriptions</option>
                <option value="editions">Editions</option>
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
          <input type="checkbox" id="lemmatize" name="lemmatize" style="padding: unset">
        </div>
      </td>
      <td>
        <button type="submit" class="btn btn-primary" id="searchButton" name="Search">Search</button>
      </td>
    </tr>
</table>

  <div id="error_message">
  </div>

    <div id="noMatchesDiv">
    </div>

    <table class="doctable dataTable no-footer fixed" id="resultsTable">
<!--        <col width="40%" />-->
<!--        <col width="5%" />-->
<!--        <col width="20%" />-->
<!--        <col width="10%" />-->
<!--        <col width="20%" />-->
<!--        <col width="5%" />-->
        <thead></thead>
        <tbody></tbody>
    </table>

    <p></p>`
  }
}



/**
 * sets up event listeners and actions for the search page
 */
export function setupSearchPage() {

  // selectors for catching user input
  let keywords_box = $("#keywordBox")
  let lemmatization_box = $("#lemmatize")
  let corpus_selector = $("#corpus-select")

  // selectors for signaling errors to the user
  let errorMessageDiv = $("#error_message")

  // make api calls to get list contents for the creator and title forms
  getCreatorsAndTitles('apisearchtranscriptions', errorMessageDiv)
  getCreatorsAndTitles('apisearchtranscribers', errorMessageDiv)

  // search event
  $("#searchButton").on("click", function () {

    if (state !== STATE_INIT) {
      console.log(`Search button clicked while searching or processing results. Nothing to do. State = ${state}`)
      return
    }

    // get user input
    let user_input = keywords_box.val()

    if (user_input !== "") {
      search()
    }
    else {
      errorMessageDiv.html(`<br>Please type in a keyword!<br><br>`)
    }
  })

  // event listeners to prevent simultanity of lemmatization and wildcards
  lemmatization_box.on("click",  function () {
    let checked = lemmatization_box.prop("checked")
    let user_input = keywords_box.val()
    if (checked && user_input.includes("*")) {
      errorMessageDiv.html(`You cannot use wildcards (*) combined with lemmatization`)
      $("#searchButton").prop("disabled",true);
    } else {
      errorMessageDiv.html('')
      $("#searchButton").prop("disabled",false);
    }
  })

  keywords_box.on("keyup",  function () {
    let checked = lemmatization_box.prop("checked")
    let user_input = keywords_box.val()
    if (checked && user_input.includes("*")) {
      errorMessageDiv.html(`You cannot use wildcards (*) combined with lemmatization`)
      $("#searchButton").prop("disabled",true);
    } else {
      errorMessageDiv.html('')
      $("#searchButton").prop("disabled",false);
    }

    // adjust the keyword distance to the number of given keywords
    let numKeywords = user_input.split(' ').length
    let minimumKeywordDistance

    if (numKeywords%2 === 0) {
      minimumKeywordDistance = numKeywords - (~~(numKeywords/2)+1)
    } else {
      minimumKeywordDistance = numKeywords - (~~(numKeywords/2)+2)
    }

    if ($("#keywordDistanceValue").val() < minimumKeywordDistance) {
      $("#keywordDistanceValue").val(minimumKeywordDistance)
    }
  })

  // event listeners to adjust the keyword distance to the number of given keywords
  $("#keywordDistanceValue").on("change", function () {

    let user_input = keywords_box.val()
    let numKeywords = user_input.split(' ').length
    let minimumKeywordDistance

    if (numKeywords%2 === 0) {
      minimumKeywordDistance = numKeywords - (~~(numKeywords/2)+1)
    } else {
      minimumKeywordDistance = numKeywords - (~~(numKeywords/2)+2)
    }

    if ($("#keywordDistanceValue").val() < minimumKeywordDistance) {
      $("#keywordDistanceValue").val(minimumKeywordDistance)
      errorMessageDiv.html(`The keyword distance for ${numKeywords} keywords needs to be at least ${minimumKeywordDistance} to deliver any matches. For more information hover over the title ,Keyword Distance‘ above.`)
    } else {
      errorMessageDiv.html('')
    }
  })

  // corpus selection event
  corpus_selector.on("change",function (){
    let doc_or_edition = $("#doc-or-edition")
    let trans_or_editor = $("#transcriber-or-editor")

    $('#titleList').empty()
    $('#creatorList').empty()
    $('#titleBox').val('')
    $('#creatorBox').val('')

    console.log(`corpus of the query was changed to ${$(this).find(":selected").val()}`)

    if ($(this).find(":selected").val() === 'transcriptions') {
      doc_or_edition.text("Document")
      trans_or_editor.text("Transcriber")

      // Get lists for transcription and transcriber forms
      getCreatorsAndTitles ('apisearchtranscriptions', errorMessageDiv)
      getCreatorsAndTitles ('apisearchtranscribers', errorMessageDiv)
    }
    else {
      doc_or_edition.text("Edition Title")
      trans_or_editor.text("Editor")

      // Get lists for edition and editor forms
      getCreatorsAndTitles ('apisearcheditions', errorMessageDiv)
      getCreatorsAndTitles ('apisearcheditors', errorMessageDiv)
    }
  })
}

/**
 * makes api calls to get complete lists of indexed values, i.e. titles or transcribers
 * @param category
 * @param errorMessageDiv
 */
function getCreatorsAndTitles(category, errorMessageDiv) {

  let apiUrl = ''
  let listSelector = ''

  if (category === 'apisearchtranscriptions') {
    apiUrl = urlGen.apiSearchTranscriptionTitles()
    listSelector = '#titleList'
  }
  else if (category === 'apisearchtranscribers') {
    apiUrl = urlGen.apiSearchTranscribers()
    listSelector = '#creatorList'
  }
  else if (category === 'apisearcheditors') {
    apiUrl = urlGen.apiSearchEditors()
    listSelector = '#creatorList'
  }
  else if (category === 'apisearcheditions') {
    apiUrl = urlGen.apiSearchEditionTitles()
    listSelector = '#titleList'
  }

  // make API request
  $.post(apiUrl).done((apiResponse) => {
    // get list selector and clear the list
    let list = $(listSelector);
    list.empty();

    // catch errors
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
    console.log(category);

    // get items from apiResponse
    let items = apiResponse[category];

    // fill list with item names
    items.forEach((item) => { list.append(`<option>${item}</option>`); });
  });
}

/**
 * query the typesense index via an api call
 */
function search() {

  // clear global variables for zooming and displaying the search results
  data_for_zooming = []
  zoom = [parseInt($("#keywordDistanceValue").val())+1]
  noPassageMatchedInTotal = true
  numDisplayedPassages = 0
  numDisplayedTitles = 0
  prevTitle = ''

  // get searched text, its language and the target corpus
  let ld = new LanguageDetector({ defaultLang: 'la'})
  let searchText = $("#keywordBox").val()
  let detectedLang = ld.detectLang(searchText)
  let corpus = $("#corpus-select").find(":selected").val()

  console.log(`Detected language for '${searchText}' is '${detectedLang}'`)

  // collect user inputs
  const inputs = {
    corpus: corpus,
    searched_phrase: searchText,
    lang: detectedLang,
    title: $("#titleBox").val(),
    creator: $("#creatorBox").val(),
    keywordDistance: parseInt($("#keywordDistanceValue").val())+1,
    zoom: $("#zoomValue").val(),
    lemmatize: $("#lemmatize").prop("checked")
  };

  // get result table selectors
  const resultsBody = $("#resultsTable tbody");
  const resultsHead = $("#resultsTable thead");
  const errorMessage = $("#error_message");

  // clear results table and error message
  resultsBody.html('');
  resultsHead.html('');
  errorMessage.html('');

  state = STATE_WAITING_FOR_SERVER


  // make API Call, namely:
  // make a prefix query in typesense for the longest keyword in the searched phrase, which does not begin with an asterisk
  makeApiCall(inputs)
}

/**
 * make api call to query the typesense index, as a recursive function actually multiple api calls will be made
 * @param inputs
 */
function makeApiCall(inputs) {

  let p = new SimpleProfiler('search')

  // selectors
  const spinner = $("#spinner");
  const errorMessage = $("#error_message");
  let corpus = $("#corpus-select").find(":selected").val()

  // api call
  $.post(urlGen.apiSearchKeyword(), inputs)
      .done((apiResponse) => {

        // catch Error
        if (apiResponse.status !== 'OK') {
          console.log(`Error in query`);
          spinner.remove();
          if (apiResponse.errorData !== undefined) {
            console.log(apiResponse.errorData);
          }
          errorMessage.html('Error while searching, please report to technical administrators.').removeClass('text-error');
          state = STATE_INIT
          return;
        }

        p.lap('Got results from server')

        // log api response
        console.log(apiResponse);

        // get the search results from the next page, if query not already finished
        // and stop querying the typesense index when already having displayed 1000 matched passages
        if (apiResponse.queryFinished !== true && numDisplayedPassages < 1000) {
          inputs.queryPage = apiResponse.queryPage + 1;
          makeApiCall(inputs);
        } else if (numDisplayedPassages > 1000) {
          errorMessage.html("Broke up query because there are too many results. Please specify your query.")
          apiResponse.queryFinished = true;
        }

        // search results data processing
        if (apiResponse.query.length !== 0 || apiResponse.queryFinished) {

          // get relevant data from the api response
          let tokensForQuery = apiResponse.tokensForQuery;
          let lemmatize = apiResponse.lemmatize;
          let lemmata = apiResponse.lemmata;
          let keywordDistance = apiResponse.keywordDistance;

          // if the typesense query was a match-all query, now remove the asterisk from the tokensForQuery array
          if (tokensForQuery[0] === '*') {
            tokensForQuery.shift();
          }

          let numTokens = tokensForQuery.length;

          // get all information about the matched items, including the passages with the matched token as lists of tokens
          let data = collectData(apiResponse.query, tokensForQuery[0], tokensForQuery, lemmata, keywordDistance, lemmatize, apiResponse.corpus);

          // filter out columns and passages that do not match ALL tokens
          for (let i = 0; i < numTokens; i++) {
            data = filterData(data, tokensForQuery[i], lemmata[i], lemmatize);
          }

          // remove overlapping or duplicate passages
          data = removeOverlappingPassagesOrDuplicates(data);

          if (data.length !== 0) {
            console.log(data);
          }

          // make array to store zoom data in – default zoom values are dependent on the keyword distance values
          let numPassagesTotal = getNumPassages(data);
          for (let i = 0; i < numPassagesTotal; i++) {
            zoom.push(inputs.keywordDistance)
          }

          // display the results
          state = STATE_DISPLAYING_RESULTS

          displayResults(data, apiResponse.lang, numPassagesTotal, zoom, inputs.keywordDistance, corpus, apiResponse.queryPage, apiResponse.queryFinished).then(() => {
            p.stop(`results from page ${apiResponse.queryPage} displayed`)
          })
        }
      })
      .fail((status) => {
        console.log(status);
        spinner.remove();
        errorMessage.html('Search is currently not available. Please try again later.').removeClass('text-error');
      });

}

/**
 * collects all relevant search result data, incl. the positions of the searched token and the passages, in which it is contained
 * @param query
 * @param token
 * @param tokensForQuery
 * @param lemmata
 * @param keywordDistance
 * @param lemmatize
 * @param corpus
 * @returns {*[]}
 */
function collectData(query, token, tokensForQuery, lemmata, keywordDistance, lemmatize, corpus) {

  // determine filter algorithm based on the asterisks in the queried token, then remove all asterisks for further processing
  const filter = getFilterType(token);
  token = token.replace(/\*/g, "");

  let data = [];
  const numMatches = query.length;

  if (numMatches !== 0) {
    for (let i = 0; i < numMatches; i++) {
      let page, seq, foliation, column, docID, pageID, typesenseID, textTokenized, textLemmatized;
      let tableId, chunk;

      // get data from query
      if (corpus === 'transcriptions') {
        ({ page, seq, foliation, column, docID, pageID, id: typesenseID, transcription_tokens: textTokenized, transcription_lemmata: textLemmatized } = query[i].document);
      } else if (corpus === 'editions') {
        ({ table_id: tableId, chunk, id: typesenseID, edition_tokens: textTokenized, edition_lemmata: textLemmatized } = query[i].document);
      }

      const { title, creator } = query[i].document;

      // get positions of the matched words
      let posLower, posUpper;
      if (lemmatize) {
        posLower = getPositions(textLemmatized, lemmata[0], 'lemma');
        posUpper = getPositions(textLemmatized, capitalizeFirstLetter(lemmata[0]), 'lemma');
      } else {
        posLower = getPositions(textTokenized, token, filter);
        posUpper = getPositions(textTokenized, capitalizeFirstLetter(token), filter);
      }

      const posAll = [...new Set([...posLower, ...posUpper])].sort((a, b) => a - b);

      // ger passages surrounding the matched words
      let passageTokenized = [], passageLemmatized = [], passageCoordinates = [], tokensMatched = [];

      posAll.forEach(pos => {
        let passageData = getPassage(textTokenized, pos, keywordDistance);
        passageTokenized.push(passageData.passage);

        if (lemmatize) {
          passageData = getPassage(textLemmatized, pos, keywordDistance);
          passageLemmatized.push(passageData.passage);
        }

        passageCoordinates.push([passageData.start, passageData.end]);
        tokensMatched.push(textTokenized[pos]);
      });

      tokensMatched = [...new Set(tokensMatched)];
      const numPassages = passageTokenized.length;
      const matchedTokenPositions = Array.from({ length: numPassages }, () => []);

      // collect and return all processed data
      let entry = {
        title,
        positions: posAll,
        creator,
        typesenseID,
        text_tokenized: textTokenized,
        text_lemmatized: textLemmatized,
        tokens_for_query: tokensForQuery,
        lemmata,
        filters: [],
        tokens_matched: tokensMatched,
        num_passages: numPassages,
        passage_coordinates: passageCoordinates,
        passage_tokenized: passageTokenized,
        passage_lemmatized: passageLemmatized,
        lemmatize,
        matched_token_positions: matchedTokenPositions
      };

      if (corpus === 'transcriptions') {
        Object.assign(entry, { page, seq, foliation, column, pageID, docID });
      } else {
        Object.assign(entry, { chunk, table_id: tableId });
      }

      data.push(entry);
    }

  }

  return data;
}

/**
 * capitalizes the first letter of a given string
 * @param string
 * @returns {string}
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * returns the filter type for a given string with or without asterisks in it
 * @param token
 * @returns {string}
 */
function getFilterType(token) {
  if ((token.match(/\*/g) || []).length !== 0) {
    const numChars = token.length;
    if (token[0] === '*' && token[numChars - 1] !== '*') {
      return 'match_suffix';
    } else if (token[0] === '*' && token[numChars - 1] === '*') {
      return 'match_body';
    } else if (token[numChars - 1] === '*') {
      return 'match_prefix';
    }
  } else {
    return 'match_full';
  }
}

/**
 * calculates the positions of a token in a text on the basis of a given match-filter
 * @param text
 * @param token
 * @param filter
 * @returns {*[]}
 */
function getPositions(text, token, filter) {
  let positions = [];

  for (let i = 0; i < text.length; i++) {
    let currentToken = text[i];

    if (filter === 'lemma' && currentToken !== null && isLemmaOfWord(token, currentToken)) {
      positions.push(i);
    } else if (currentToken !== null && isMatching(currentToken, token, filter)) {
      positions.push(i);
    }
  }

  return positions;
}

/**
 * cuts out a passage around a given token from a given text-array
 * @param text
 * @param pos
 * @param keywordDistance
 * @returns {{passage: *[], start: number, end: number}}
 */
function getPassage(text, pos, keywordDistance) {
  let passage = [text[pos]];
  let passageStart = 0;
  let passageEnd = 0;

  const numTokens = text.length;
  const precTokens = text.slice(0, pos).reverse();
  const sucTokens = text.slice(pos + 1, numTokens);

  for (let i = 0; i < keywordDistance && i < precTokens.length; i++) {
    passage.unshift(precTokens[i]);
    passageStart = pos - i - 1;
  }

  for (let i = 0; i < keywordDistance && i < sucTokens.length; i++) {
    passage.push(sucTokens[i]);
    passageEnd = pos + i + 1;
  }

  if (!passage[0] || ".,:;- –]/".includes(passage[0])) {
    passage.shift();
    passageStart += 1;
  }

  return { passage, start: passageStart, end: passageEnd };
}

/**
 * checks if a given token is a match for a string (the needle) based on a given match-filter
 * @param token
 * @param needle
 * @param filter
 * @returns {boolean|*}
 */
function isMatching(token, needle, filter) {
  const needleForLemmataCheck = ` ${needle} `;

  if (filter === 'match_full') {
    return token === needle || token === needle.charAt(0).toUpperCase() + needle.slice(1) || token.includes(needleForLemmataCheck);
  } else if (filter === 'match_prefix') {
    return (token.startsWith(needle) || token.startsWith(needle.charAt(0).toUpperCase() + needle.slice(1))) && token.length !== needle.length;
  } else if (filter === 'match_suffix') {
    return token.endsWith(needle) && token.indexOf(needle) === token.length - needle.length;
  } else if (filter === 'match_body') {
    return token.includes(needle) && token.indexOf(needle) !== 0 && token.indexOf(needle) !== token.length - needle.length;
  }
  return false;
}

/**
 * filters out passages from the collected typesense search results, that do not match the given token or lemma.
 * this function is very important if a search query
 * (a) has more than one keyword or
 * (b) contains only words with wildcards – in this case typesense returned all items of an index.
 * @param data
 * @param tokenPlain
 * @param lemma
 * @param lemmatize
 * @returns {*}
 */
function filterData(data, tokenPlain, lemma, lemmatize) {

  // LEMMATIZED SEARCH
  if (lemmatize && lemma.length > 1) {

    // iterate over the matched items in the search result
    data.forEach((match, i) => {

      // iterate over the passages of a matched item
      match.passage_lemmatized.forEach((passage, j) => {

        let noMatch = true;

        // iterate over the tokens in a passage
        passage.forEach((token, k) => {

          // if the queried lemma is the lemma of the present token, save the token and its position to the search result data
          if (isLemmaOfWord(lemma, token)) {
            data[i].tokens_matched.push(match.passage_tokenized[j][k]);
            data[i].matched_token_positions[j].push(data[i].passage_coordinates[j][0] + k);
            noMatch = false;
          }
        });

        // if no token in the passage matched the queried lemma, remove the passage from the search result data
        if (noMatch) {
          delete data[i].passage_tokenized[j];
          delete data[i].passage_lemmatized[j];
          delete data[i].passage_coordinates[j];
          delete data[i].matched_token_positions[j];
          delete data[i].positions[j];
          data[i].num_passages -= 1;

        // if there was at least one match, remove possible duplicates from the tokens_matched-attribute of the matched item
        } else {
          data[i].tokens_matched = [...new Set(data[i].tokens_matched)];
        }
      });

      // remove all tokens from the tokens_matched attribute of a matched item which are not any more in any passage
      data[i].tokens_matched.forEach((token) => {
        let inPassage = false
        data[i].passage_tokenized.forEach((passage) => {
          if (passage.includes(token)) {
            inPassage = true
          }
        })

        if (!inPassage) {
          data[i].tokens_matched = data[i].tokens_matched.filter(e => e !== token);
        }
      })
    });
  }

  // UNLEMMATIZED SEARCH
  else if (!lemmatize) {


    let filter = getFilterType(tokenPlain);
    tokenPlain = tokenPlain.replace(/\*/g, "");

    // iterate over the matched items in the search result
    data.forEach((match, i) => {
      data[i].filters.push(filter); // save filter type for the queried token

      // iterate over the passages of the matched item
      match.passage_tokenized.forEach((passage, j) => {
        let numMatchedTokens = data[i].tokens_matched.length;

        // iterate over the tokens in the passage
        passage.forEach((token, k) => {

          // if the queried token matches the present token, save the token and its position to the search result data
          if (isMatching(token, tokenPlain, filter)) {
            data[i].tokens_matched.push(passage[k]);
            data[i].matched_token_positions[j].push(data[i].passage_coordinates[j][0] + k);
          }
        });

        // if no token in the passage matched the queried token, remove the passage from the search result data
        if (numMatchedTokens === data[i].tokens_matched.length) {
          delete data[i].passage_tokenized[j];
          delete data[i].passage_lemmatized[j];
          delete data[i].passage_coordinates[j];
          delete data[i].matched_token_positions[j];
          delete data[i].positions[j];
          data[i].num_passages -= 1;
        }

        // if there was at least one match, remove possible duplicates from the tokens_matched-attribute of the matched item
        else {
          data[i].tokens_matched = [...new Set(data[i].tokens_matched)];
        }
      });

      // remove all tokens from the tokens_matched attribute of a matched item which are not any more in any passage
      data[i].tokens_matched.forEach((token) => {
        let inPassage = false
        data[i].passage_tokenized.forEach((passage) => {
          if (passage.includes(token)) {
            inPassage = true
          }
        })

        if (!inPassage) {
          data[i].tokens_matched = data[i].tokens_matched.filter(e => e !== token);
        }
      })
    });
  }

  // return data as an array of arrays and filter out matched items that do not contain anymore any passage
  return data.map(match => {
    match.passage_tokenized = Object.values(match.passage_tokenized);
    match.passage_lemmatized = Object.values(match.passage_lemmatized);
    match.tokens_matched = Object.values(match.tokens_matched);
    match.passage_coordinates = Object.values(match.passage_coordinates);
    match.matched_token_positions = Object.values(match.matched_token_positions);
    match.positions = Object.values(match.positions);
    return match;
  }).filter(match => match.passage_tokenized.length > 0);
}

/**
 * checks if a given string is a lemma of a given token
 * @param lemma
 * @param token
 * @returns {*|boolean}
 */
function isLemmaOfWord(lemma, token) {
  return token.includes(" "+lemma+" ") || token === lemma;
}

/**
 * removes duplicates and subsets from an array of arrays of numbers
 * @param array
 * @returns {any[]}
 */
function removeDuplicatesAndSubsets(array) {
  const cleanMatchedTokenPositions = new Set(array.keys());
  const seenItems = new Map();

  array.forEach((item, index) => {
    const key = JSON.stringify(item);

    if (seenItems.has(key)) {
      // Behalte nur das erste Vorkommen eines Duplikats
      cleanMatchedTokenPositions.delete(index);
    } else {
      seenItems.set(key, index);
    }
  });

  array.forEach((item, index) => {
    array.forEach((existingItem, existingIndex) => {
      if (
          index !== existingIndex &&
          cleanMatchedTokenPositions.has(index) &&
          cleanMatchedTokenPositions.has(existingIndex)
      ) {
        const isSubset = item.every(val => existingItem.includes(val));
        const isSuperset = existingItem.every(val => item.includes(val));

        if (isSubset) {
          cleanMatchedTokenPositions.delete(index);
        } else if (isSuperset) {
          cleanMatchedTokenPositions.delete(existingIndex);
        }
      }
    });
  });

  return [...cleanMatchedTokenPositions];
}

/**
 * removes overlapping passages and passage duplicates from the search results data
 * @param data
 * @returns {*}
 */
function removeOverlappingPassagesOrDuplicates(data) {
  return data.map(match => {

    let cleanMatchedTokenPositions = removeDuplicatesAndSubsets(match.matched_token_positions);

    match.matched_token_positions = match.matched_token_positions.filter((_, index) => cleanMatchedTokenPositions.includes(index));
    match.passage_tokenized = match.passage_tokenized.filter((_, index) => cleanMatchedTokenPositions.includes(index));
    match.passage_lemmatized = match.passage_lemmatized.filter((_, index) => cleanMatchedTokenPositions.includes(index));
    match.passage_coordinates = match.passage_coordinates.filter((_, index) => cleanMatchedTokenPositions.includes(index));
    match.positions = match.positions.filter((_, index) => cleanMatchedTokenPositions.includes(index));

    match.num_passages = match.passage_tokenized.length;

    return match;
  }).filter(match => match.num_passages > 0);
}

/**
 * returns number of passages in the search results data
 * @param data
 * @returns {*}
 */
function getNumPassages(data) {
  return data.reduce((total, match) => total + match.num_passages, 0);
}


/**
 * displays the search results in a readable form
 * @param data
 * @param lang
 * @param num_passages
 * @param zoom
 * @param keywordDistance
 * @param corpus
 * @param queryPage
 * @param queryFinished
 * @returns {Promise<void>}
 */
async function displayResults (data, lang, num_passages, zoom, keywordDistance, corpus, queryPage, queryFinished) {

  // results table selectors
  let results_body = $("#resultsTable tbody")
  let results_head = $("#resultsTable thead")

  // count matched items and titles
  let num_matches = data.length // means matches in the open-search index, not identical to num_passages
  let num_titles = getNumTitles(data, num_matches)

  // make table head
  if (queryPage === 1) {
    if (corpus === 'transcriptions') { // for transcriptions
      results_head.empty()
      results_head.append(`<tr><th><span id="matchedPassage" title="Passages can overlap, but in total do never contain exactly the same matched words.">Matched Passage (0)</span></th><th id="spinner-or-global-zoom"><div id="spinner" class="spinner-border" style="width: 15px; height: 15px;" role="status"></div></th>
                                <th id="documentName">Title (0)</th><th>Foliation</th><th>Transcriber</th><th>Link</th></tr>`)
    } else if (corpus === 'editions') { // for editions
      results_head.empty()
      results_head.append(`<tr><th><span id="matchedPassage" title="Passages can overlap, but in total do never contain exactly the same matched words.">Matched Passage (0)</span></th><th id="spinner-or-global-zoom"><div id="spinner" class="spinner-border" style="width: 15px; height: 15px;" role="status"></div></th><th id="documentName">Title (0)</th><th>Chunk</th><th>Editor</th><th>Link</th></tr>`)
    }
    results_body.empty()

    if (num_passages > 0) {
      noPassageMatchedInTotal = false
    }
  }

  // if there is no matched passage for a query, display this to the user and empty the results table
  if (queryFinished && noPassageMatchedInTotal) {
    results_body.empty()
    results_body.html(`<br>&nbsp;&nbsp;Nothing found!<br><br>`)
    $("#spinner").remove()
    state = STATE_INIT

  // if there is at least one matched passage or the query is not yet finished, process and display the matched passage(s)
  } else {

    // number of already displayed passages and titles
    numDisplayedPassages = parseInt($("#matchedPassage").html().replace(/[^0-9]/g, ""));
    numDisplayedTitles = parseInt($("#documentName").html().replace(/[^0-9]/g, ""));

    // update displayed number of matched passages and titles
    $("#matchedPassage").html(`Matched Passage (${numDisplayedPassages + num_passages})`);

    if (num_matches !== 0 && data[0].title !== prevTitle) {
        $("#documentName").html(`Title (${numDisplayedTitles + num_titles})`);
    }
    
    if (num_titles>1 && data[0].title === prevTitle) {
      $("#documentName").html(`Title (${numDisplayedTitles + num_titles - 1})`);
    } else if (num_titles>1 && data[0].title !== prevTitle) {
      $("#documentName").html(`Title (${numDisplayedTitles + num_titles})`);
    }
    
    if ((numDisplayedPassages + num_passages) > 0) {
      noPassageMatchedInTotal = false
    }

    // index for the creation and naming of the non-global zoom sliders
    let k = 0

    // append all matched passages to the results table
    for (let i = 0; i < num_matches; i++) {

      // collect relevant data and make variables
      let title = data[i]['title']
      let tokens_matched = data[i]['tokens_matched']
      let passages = data[i]['passage_tokenized']
      let positions = data[i]['positions']
      let text_tokenized = data[i]['text_tokenized']
      let creator = data[i]['creator']

      let foliation, seq, docID, column, table_id, chunk, link

      if (corpus === 'transcriptions') {
        seq = data[i]['seq']
        foliation = data[i]['foliation']
        docID = data[i]['docID']
        column = data[i]['column']
        link = convertToLink(urlGen.sitePageView(docID, seq, column))
      } else {
        table_id = data[i]['table_id']
        chunk = data[i]['chunk']
        link = convertToLink(urlGen.siteCollationTableEdit(table_id))
      }

      // get relevant data for zooming and slice and highlight each passage
      for (let j = 0; j < passages.length; j++) {
        k = k + 1

        // data for zooming
        data_for_zooming.push({
          'text_tokenized': text_tokenized,
          'tokens_matched': tokens_matched,
          'position': positions[j]
        })

        let passage = cutOutPassageWithHighlights(text_tokenized, tokens_matched, positions[j], keywordDistance, zoom[k])

        // fill results table
        if (corpus === 'transcriptions') {
          fillResultsTable(passage, title, foliation, creator, link, lang, zoom, prevTitle, numDisplayedPassages+k)
        } else if (corpus === 'editions') {
          fillResultsTable(passage, title, chunk, creator, link, lang, zoom, prevTitle, numDisplayedPassages+k)
        }
        prevTitle = title
      }
    }


    // if the query is finished, implement global zoom handling
    if (queryFinished) {

      state = STATE_INIT

      $("#spinner-or-global-zoom").html(`<span title="Number of tokens, i. e. words or punctuation marks, to display before and after your first keyword. A value of 0 means that only the tokens matching your first keyword are displayed."><label for="zoomGlobal"></label><input type="number" id="zoomGlobal" name="zoomGlobal" min="0" max="80" value=${zoom[0]}></span>`);

      let zoom_global = $("#zoomGlobal")
      let cancelled = false

      // global zoom event
      $(zoom_global).off('change').on("change", async () => {

        if (state !== STATE_INIT) {
          console.log(`Global zoom clicked while state = ${state}, nothing to do`)
          return
        }

        for (let i = 1; i < (numDisplayedPassages + num_passages + 1); i++) {

          if (state !== STATE_INIT) {
            // if state has changed, cancel current update
            cancelled = true
            break
          }

          // set every non-global zoom slider to the value of the global zoom slider
          let name = "#zoomValue" + i
          let value = zoom_global.val()

          $(name).prop("value", value)
          zoom[i] = $(name).val()

          // update the results table
          let keywordDistance_slider = $("#keywordDistanceValue")
          let keywordDistance = parseInt(keywordDistance_slider.val()) + 1
          updateResults(data_for_zooming, zoom, keywordDistance, i)
        }
      })
    }
  }
}

/**
 * updates the display of the search results, if a user is zooming
 * @param data
 * @param zoom
 * @param keywordDistance
 * @param index
 */
function updateResults (data, zoom, keywordDistance, index) {

  // results table body selector
  let results_body = document.getElementById("resultsTable")

  // relevant data
  let tokens_matched = data[index-1]['tokens_matched']
  let text_tokenized = data[index-1]['text_tokenized']
  let position = data[index-1]['position']

  // get and display the modified passage
  results_body.rows[index].cells[0].innerHTML = cutOutPassageWithHighlights(text_tokenized, tokens_matched, position, keywordDistance, zoom[index])
}

/**
 * converts a string to a html-link 
 * @param url
 * @returns {string}
 */
function convertToLink (url) {
  return `<a class="fas fa-external-link-alt" target="_blank" href=${url} </a>`;
}

/**
 * calculates the total number of matched titles, not matched items, which can belong to the same title
 * @param data
 * @param numMatchedItems
 * @returns {number}
 */
function getNumTitles (data, numMatchedItems) {

  let num_titles = 0
  let prev_title = ""

  for (let i=0; i<numMatchedItems; i++) {
    let title = data[i]['title']
    if (title !== prev_title) {
      num_titles = num_titles + 1
    }
    prev_title = title
  }

  return num_titles
}

/**
 * cuts out a passage out of a given text depending on the given zoom value and
 * highlights the searched keywords in the passage depending on the given keyword distance
 * @param text
 * @param tokens_matched
 * @param centralKeywordPosition
 * @param keywordDistance
 * @param zoom
 * @returns {*}
 */
function cutOutPassageWithHighlights (text, tokens_matched, centralKeywordPosition, keywordDistance, zoom) {

  // CUT OUT
  let text_len = text.length
  let passage_start = centralKeywordPosition-zoom
  let passage_end = parseInt(centralKeywordPosition)+parseInt(zoom)+1

  if (passage_start < 0) {
    passage_start = 0
  }

  if (passage_end > (text_len-1)) {
    passage_end = text_len
  }

  let passage = text.slice(passage_start, passage_end)

  // HIGHLIGHT
  let passage_highlighted = ""

  for (let i=0; i<passage.length; i++) {

    let token = passage[i]
    if (tokens_matched.indexOf(token) !== -1 && insideKeywordDistance(i+passage_start, centralKeywordPosition, keywordDistance)) {
      token = "<mark>" + token + "</mark>"
    }

    passage_highlighted = passage_highlighted + token + " "
  }

  return removeBlanks(passage_highlighted)
}

/**
 * checks if the given position (of a matched token) is inside the given keyword distance
 * @param matchedTokenPosition
 * @param centralKeywordPosition
 * @param keywordDistance
 * @returns {boolean}
 */
function insideKeywordDistance (matchedTokenPosition, centralKeywordPosition, keywordDistance) {

  let distance = Math.abs(matchedTokenPosition-centralKeywordPosition)
  return distance <= keywordDistance;
}

/**
 * removes blanks before and after specific special characters and from the beginning of a string (a passage)
 * @param text
 * @returns {*}
 */
function removeBlanks (text) {
  text = text.replaceAll(" .", ".")
  text = text.replaceAll(" ,", ",")
  text = text.replaceAll(" :", ":")
  text = text.replaceAll("[ ", "[")
  text = text.replaceAll(" ]", "]")
  text = text.replaceAll(" ?", "?")
  text = text.replaceAll(" ;", ";")
  text = text.replaceAll("( ", "(")
  text = text.replaceAll(" )", ")")

  if (text.substring(0, 1) === "." || text.substring(0, 1) === ",") {
    text = text.replace(".", "")
    text = text.replace(",", "")
  }

  return text.trimStart()
}

/**
 *
 * @param passage
 * @param title
 * @param identifier
 * @param transcriber
 * @param link
 * @param lang
 * @param zoom
 * @param prev_title
 * @param k
 * @returns {boolean}
 */
function fillResultsTable(passage, title, identifier, transcriber, link, lang, zoom, prev_title=' ', k) {

  // results table body selector
  let results_body = $("#resultsTable tbody")

    // title of the passage is identical to the title of the previous passage
    if (title === prev_title) {

      if (lang === 'la') {
        results_body.append(
            `<tr><td class="text-la" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td >${identifier}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      } else if (lang === 'he') {
        results_body.append(
            `<tr><td class="text-he" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td >${identifier}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      } else if (lang === 'ar') {
        results_body.append(
            `<tr><td class="text-ar" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td >${identifier}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      }

      // title of the passage is not identical to the title of the previous passage
    } else {
      if (lang === 'la') {
        results_body.append(
            `<tr><td class="text-la" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td >${identifier}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      } else if (lang === 'he') {
        results_body.append(
            `<tr><td class="text-he" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td >${identifier}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      } else if (lang === 'ar') {
        results_body.append(
            `<tr><td class="text-ar" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td >${identifier}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      }
    }

  // non-global zoom events
  for (let i=1; i<(k+1); i++) {

    let name = "#zoomValue" + i

    // set up zoom action
    $(name).on("change", function () {
      zoom[i] = $(name).val()

      // update results table
      let keywordDistance_slider = $("#keywordDistanceValue")
      let keywordDistance = parseInt(keywordDistance_slider.val()) + 1
      updateResults(data_for_zooming, zoom, keywordDistance, i)
    })
  }

  return true
}



window.SearchPage = SearchPage;