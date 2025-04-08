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



export class SearchPageNew extends NormalPage {

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
        <th style="text-align: center"><span title="Number of tokens, i. e. words or punctuation marks, that are allowed to occur between the longest given keyword and each of the others. Having two keywords a value of 0 means that only the occurrence of directly consecutive words counts as a match. Having three keywords a value of 0 means that only the occurrence of your longest keyword in the middle of the other two counts as a match. Having four keywords a value of 0 cannot deliver any matches, because at least one of the keywords will have the distance 1 from the longest given keyword. It is recommended not to use too low values for the keyword distance. This could result in overlooking possible matches.">Keyword Distance</span></th>
        <th class="text-center"><span title="If checked, all conjugated or declined forms of your keywords will count as matches. Be aware, that searches containing articles or conjunctions like ,and‘ can cause too many and not desired matches. Best practice is searching only for nouns, verbs and/or adjectives.">Lemmatization</span></th>
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

    <table class="doctable dataTable no-footer fixed" id="resultsTable">
        <col width="40%" />
        <col width="5%" />
        <col width="20%" />
        <col width="10%" />
        <col width="20%" />
        <col width="5%" />
        <thead></thead>
        <tbody></tbody>
    </table>

    <p></p>`
  }
}


window.SearchPageNew = SearchPageNew;


export function setupSearchPage() {

  // Get selectors for catching user input
  let keywords_box = $("#keywordBox")
  let lemmatization_box = $("#lemmatize")
  let corpus_selector = $("#corpus-select")

  // Get selector for signaling errors to user
  let errorMessageDiv = $("#error_message")

  // Get lists for creator and title forms
  getCreatorsAndTitles ('apisearchtranscriptions', errorMessageDiv)
  getCreatorsAndTitles ('apisearchtranscribers', errorMessageDiv)

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
      $("#searchButton").prop("disabled",true);
    } else {
      errorMessageDiv.html('')
      $("#searchButton").prop("disabled",false);
    }
  })

  keywords_box.on("keyup",  function (event) {
    let checked = lemmatization_box.prop("checked")
    let user_input = keywords_box.val()
    if (checked && user_input.includes("*")) {
      $("#searchButton").prop("disabled",false);
      $("#searchButton").prop("disabled",true);
    } else {
      errorMessageDiv.html('')
      $("#searchButton").prop("disabled",false);
    }

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

  $("#keywordDistanceValue").on("change", function (event) {

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


// Function to get list of indexed values, i.e. titles or transcribers, via an API call
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
    console.log(category);

    // Get items from apiResponse
    let items = apiResponse[category];

    // Fill list with item names
    items.forEach((item) => { list.append(`<option>${item}</option>`); });
  });
}

// Function to query the OpenSearch index
function search() {

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
  //spinner.html(`<span style="font-size: 2em">Getting results from server</span> ${spinnerHtml}`);

  state = STATE_WAITING_FOR_SERVER


  // Make API Call, namely make a prefix query in typesense for the longest keyword in the searched phrase, which does not begin with an asterisk
  makeApiCall(inputs)
}


function makeApiCall(inputs) {

  let p = new SimpleProfiler('search')

  // Selectors
  const spinner = $("#spinner");
  const errorMessage = $("#error_message");
  let corpus = $("#corpus-select").find(":selected").val()


  $.post(urlGen.apiSearchNewKeyword(), inputs)
      .done((apiResponse) => {

        // Catch Error
        if (apiResponse.status !== 'OK') {
          console.log(`Error in query`);
          spinner.empty();
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

        if (apiResponse.queryFinished !== true) {
          inputs.queryPage = apiResponse.queryPage + 1;
          makeApiCall(inputs);
        }

        let tokensForQuery = apiResponse.tokensForQuery;
        let lemmatize = apiResponse.lemmatize;
        let lemmata = apiResponse.lemmata;
        let keywordDistance = apiResponse.keywordDistance;

        if (tokensForQuery[0] === '*') {
          tokensForQuery.shift();
        }

        // Count tokens
        let numTokens = tokensForQuery.length;

        // Get all information about the matched entries, including passages with the matched token as lists of tokens
        let data = collectData(apiResponse.query, tokensForQuery[0], tokensForQuery, lemmata, keywordDistance, lemmatize, apiResponse.corpus);

        // Filter out columns and passages that do not match all tokens
        for (let i = 0; i < numTokens; i++) {
          data = filterData(data, tokensForQuery[i], lemmata[i], lemmatize);
        }

        // Remove duplicate passages
        data = removeOverlappingPassagesOrDuplicates(data);
        // console.log(data);

        // Crop data if there are more than 999 passages matched
        let numPassagesTotal = getNumPassages(data);
        const maxPassages = 999;
        let cropped = false;
        let numPassagesCropped = numPassagesTotal;

        if (numPassagesTotal > maxPassages) {
          data = cropData(data, maxPassages);
          numPassagesCropped = getNumPassages(data);
          cropped = true;
        }

        // console.log('data to display');
        console.log(data);

        // Remove spinner
        spinner.empty();

        // Make array to store zoom data in – default zoom values are dependent on the keyword distance values
        let zoom = new Array(numPassagesCropped+1).fill(inputs.keywordDistance)

        // Display results
        state = STATE_DISPLAYING_RESULTS

          displayResults(data, apiResponse.lang, numPassagesCropped, zoom, inputs.keywordDistance, numPassagesTotal, cropped, corpus, apiResponse.queryPage).then(() => {
            p.stop(`results from page ${apiResponse.queryPage} displayed`)
            state = STATE_INIT
          })
      })
      .fail((status) => {
        console.log(status);
        spinner.empty();
        errorMessage.html('Search is currently not available. Please try again later.').removeClass('text-error');
      });

}

function collectData(query, token, tokensForQuery, lemmata, keywordDistance, lemmatize, corpus) {

  // Choose filter algorithm based on asterisks in the queried token - remove asterisks for further processing
  const filter = getFilterType(token);
  token = token.replace(/\*/g, "");

  let data = [];
  const numMatches = query.length;

  if (numMatches !== 0) {
    for (let i = 0; i < numMatches; i++) {
      let page, seq, foliation, column, docID, pageID, typesenseID, textTokenized, textLemmatized;
      let tableId, chunk;

      if (corpus === 'transcriptions') {
        ({ page, seq, foliation, column, docID, pageID, id: typesenseID, transcription_tokens: textTokenized, transcription_lemmata: textLemmatized } = query[i].document);
      } else {
        ({ table_id: tableId, chunk, id: typesenseID, edition_tokens: textTokenized, edition_lemmata: textLemmatized } = query[i].document);
      }

      const { title, creator } = query[i].document;

      let posLower, posUpper;
      if (lemmatize) {
        posLower = getPositions(textLemmatized, lemmata[0], 'lemma');
        posUpper = getPositions(textLemmatized, capitalizeFirstLetter(lemmata[0]), 'lemma');
      } else {
        posLower = getPositions(textTokenized, token, filter);
        posUpper = getPositions(textTokenized, capitalizeFirstLetter(token), filter);
      }

      const posAll = [...new Set([...posLower, ...posUpper])].sort((a, b) => a - b);

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

    data.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }

  return data;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

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

function isMatching(token, needle, filter) {
  const needleForLemmataCheck = ` ${needle} `;

  if (filter === 'match_full') {
    return token === needle || token === needle.charAt(0).toUpperCase() + needle.slice(1) || token.includes(needleForLemmataCheck);
  } else if (filter === 'match_prefix') {
    return token.startsWith(needle) || token.startsWith(needle.charAt(0).toUpperCase() + needle.slice(1));
  } else if (filter === 'match_suffix') {
    return token.endsWith(needle) && token.indexOf(needle) === token.length - needle.length;
  } else if (filter === 'match_body') {
    return token.includes(needle) && token.indexOf(needle) !== 0 && token.indexOf(needle) !== token.length - needle.length;
  }
  return false;
}

// filters out prefix matches returned from typesense, when a query was intended as a full-match-query
// searches for additional keywords in the data returned from typesense for the longest keyword
// makes the actual search in cases where typesense returns all indexed items, e. g. when it is searched only for a suffix like '*losophia‘
function filterData(data, tokenPlain, lemma, lemmatize) {
  if (lemmatize && lemma.length > 1) {
    data.forEach((match, i) => {
      match.passage_lemmatized.forEach((passage, j) => {
        let noMatch = true;
        passage.forEach((token, k) => {
          if (isLemmaOfWord(lemma, token)) {
            data[i].tokens_matched.push(match.passage_tokenized[j][k]);
            data[i].matched_token_positions[j].push(data[i].passage_coordinates[j][0] + k);
            noMatch = false;
          }
        });

        if (noMatch) {
          delete data[i].passage_tokenized[j];
          delete data[i].passage_lemmatized[j];
          delete data[i].passage_coordinates[j];
          delete data[i].matched_token_positions[j];
          delete data[i].positions[j];
          data[i].num_passages -= 1;
        } else {
          data[i].tokens_matched = [...new Set(data[i].tokens_matched)];
        }
      });
    });
  } else if (!lemmatize) {
    let filter = getFilterType(tokenPlain);
    tokenPlain = tokenPlain.replace(/\*/g, "");

    data.forEach((match, i) => {
      data[i].filters.push(filter);
      match.passage_tokenized.forEach((passage, j) => {
        let numMatchedTokens = data[i].tokens_matched.length;
        passage.forEach((token, k) => {
          if (isMatching(token, tokenPlain, filter)) {
            data[i].tokens_matched.push(passage[k]);
            data[i].matched_token_positions[j].push(data[i].passage_coordinates[j][0] + k);
          }
        });
        if (numMatchedTokens === data[i].tokens_matched.length) {
          delete data[i].passage_tokenized[j];
          delete data[i].passage_lemmatized[j];
          delete data[i].passage_coordinates[j];
          delete data[i].matched_token_positions[j];
          delete data[i].positions[j];
          data[i].num_passages -= 1;
        } else {
          data[i].tokens_matched = [...new Set(data[i].tokens_matched)];
        }
      });

      // remove tokens from matched token arrays which are outside the now filtered passages
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

function isLemmaOfWord(lemma, token) {
  return token.includes(" "+lemma+" ") || token === lemma;
}

function getUniqueIndices(array) {
  const uniqueIndices = new Set(array.keys());
  const seenItems = new Map();

  array.forEach((item, index) => {
    const key = JSON.stringify(item);

    if (seenItems.has(key)) {
      // Behalte nur das erste Vorkommen eines Duplikats
      uniqueIndices.delete(index);
    } else {
      seenItems.set(key, index);
    }
  });

  array.forEach((item, index) => {
    array.forEach((existingItem, existingIndex) => {
      if (
          index !== existingIndex &&
          uniqueIndices.has(index) &&
          uniqueIndices.has(existingIndex)
      ) {
        const isSubset = item.every(val => existingItem.includes(val));
        const isSuperset = existingItem.every(val => item.includes(val));

        if (isSubset) {
          uniqueIndices.delete(index);
        } else if (isSuperset) {
          uniqueIndices.delete(existingIndex);
        }
      }
    });
  });

  return [...uniqueIndices];
}

function removeOverlappingPassagesOrDuplicates(data) {
  return data.map(match => {

    // remove duplicates
    let uniqueIndices = getUniqueIndices(match.matched_token_positions);
    // console.log(uniqueIndices);

    match.matched_token_positions = match.matched_token_positions.filter((_, index) => uniqueIndices.includes(index));
    match.passage_tokenized = match.passage_tokenized.filter((_, index) => uniqueIndices.includes(index));
    match.passage_lemmatized = match.passage_lemmatized.filter((_, index) => uniqueIndices.includes(index));
    match.passage_coordinates = match.passage_coordinates.filter((_, index) => uniqueIndices.includes(index));
    match.positions = match.positions.filter((_, index) => uniqueIndices.includes(index));

    match.num_passages = match.passage_tokenized.length;

    return match;
  }).filter(match => match.num_passages > 0);
}

function getNumPassages(data) {
  return data.reduce((total, match) => total + match.num_passages, 0);
}

function cropData(data, maxPassages) {
  let numPassagesCropped = 0;
  return data.filter(matchedColumn => {
    if (numPassagesCropped >= maxPassages) {
      return false;
    }
    numPassagesCropped += matchedColumn.num_passages;
    return true;
  });
}

function removeSubsetArrays(array) {
  const result = {};

  // Iteriere über das Eingangsarray
  array.forEach((current, currentIndex) => {
    let isSubset = false;

    array.forEach((existing, existingIndex) => {
      if (currentIndex !== existingIndex && current.every(val => existing.includes(val))) {
        isSubset = true;
      }
    });

    if (!isSubset) {
      result[currentIndex] = current; // Behalte den ursprünglichen Index bei
    }
  });

  return result;
}

// Function to collect and display the search results in a readable form
async function displayResults (data, lang, num_passages, zoom, keywordDistance, num_passages_total, cropped, corpus, queryPage) {

  // Get selectors for displaying results
  let results_body = $("#resultsTable tbody")
  let results_head = $("#resultsTable thead")
  let error_message = $("#error_message")
  const spinner = $("#spinner");

  // Count matches and titles
  let num_matches = data.length // means matches in the open-search index, not identical to num_passages
  let num_titles = getNumTitles(data, num_matches)

  // If there are no matches, display this to the user and empty the results table
  if (num_passages === 0 && queryPage === 1) {
    results_head.empty()
    results_body.empty()
    error_message.html(`<br>Nothing found!<br><br>`)
  } else {

    // Make table head
    if (queryPage === 1) {
      if (corpus === 'transcriptions') { // For transcriptions
        results_head.empty()
        results_head.append(`<tr><th><span id="matchedPassage" title="Passages can overlap, if a keyword occurs multiple times inside the chosen keyword distance.">Matched Passage (${num_passages})</span></th><th><span title="Number of tokens, i. e. words or punctuation marks, to display before and after your first keyword. A value of 0 means that only the tokens matching your first keyword are displayed."><label for="zoomGlobal"></label><input type="number" id="zoomGlobal" name="zoomGlobal" min="0" max="80" value=${zoom[0]}></span>
                                </th><th id="documentName">Document (${num_titles})</th><th>Foliation</th><th>Transcriber</th><th>Link</th></tr>`)
      } else { // For editions
        results_head.empty()
        results_head.append(`<tr><th>Matched Passage (${num_passages})</th><th><span title="Number of tokens, i. e. words or punctuation marks, to display before and after your first keyword. A value of 0 means that only the tokens matching your first keyword are displayed."><label for="zoomGlobal"></label><input type="number" id="zoomGlobal" name="zoomGlobal" min="0" max="80" value=${zoom[0]}></span>
                                </th><th>Edition (${num_titles})</th><th>Chunk</th><th>Table ID</th><th>Editor</th><th>Link</th></tr>`)
      }
      results_body.empty()
    } else {
      let numDisplayedPassages = parseInt($("#matchedPassage").html().replace(/[^0-9]/g,""));
      let numDisplayedDocuments = parseInt($("#documentName").html().replace(/[^0-9]/g,""));
      $("#matchedPassage").html(`Matched Passage (${numDisplayedPassages + num_passages})`);
      $("#documentName").html(`Document (${numDisplayedDocuments + num_titles})`);

    }

    // Make variable for storing title of previous column in the dataset to display only the title only once,
    // if there are plenty matched columns/passages in the same work
    let prev_title = ' '
    let k=0

    //spinner.html(`Processing result ${k} of ${num_passages} (${(100*(k+1)/num_passages).toFixed(0)}%)`)
    //await wait(1)

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
          fillResultsTable(passage, title, foliation, null, creator, link, lang, zoom, prev_title, k)
        }
        else {
          fillResultsTable(passage, title, chunk, table_id, creator, link, lang, zoom, prev_title, k)
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
  return `<a class="fas fa-external-link-alt" target="_blank" href=${url} </a>`;
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
  text = text.replaceAll(" ;", ";")
  text = text.replaceAll("( ", "(")
  text = text.replaceAll(" )", ")")

  if (text.substring(0, 1) === "." || text.substring(0, 1) === ",") {
    text = text.replace(".", "")
    text = text.replace(",", "")
  }

  return text.trimStart()
}

function fillResultsTable(passage, title, identifier, identifier2, transcriber, link, lang, zoom, prev_title=' ', k) {

  // Get selector
  let results_body = $("#resultsTable tbody")


  if (identifier2 !== null) {

    // Don't write title into the results table, if it is identical to the title of the previous passage
    if (title === prev_title) {

      if (lang === 'la') {
        results_body.append(
            `<tr><td class="text-la" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td >${identifier}</td><td >${identifier2}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      } else if (lang === 'he') {
        results_body.append(
            `<tr><td class="text-he" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td >${identifier}</td><td >${identifier2}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      } else if (lang === 'ar') {
        results_body.append(
            `<tr><td class="text-ar" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td></td><td >${identifier}</td><td >${identifier2}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      }
    } else {
      if (lang === 'la') {
        results_body.append(
            `<tr><td class="text-la" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td >${identifier}</td><td >${identifier2}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      } else if (lang === 'he') {
        results_body.append(
            `<tr><td class="text-he" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td >${identifier}</td><td >${identifier2}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      } else if (lang === 'ar') {
        results_body.append(
            `<tr><td class="text-ar" style="width: 50em">${passage}</td><td style="text-align: left"><label for="zoomValue${k}"></label><input type="number" id="zoomValue${k}" name="zoomValue${k}" min="0" max="80" value=${zoom[k]} </td><td>${title}</td><td >${identifier}</td><td >${identifier2}</td><td>${transcriber}</td><td >${link}</td></tr>`)
      }
    }
  } else {
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