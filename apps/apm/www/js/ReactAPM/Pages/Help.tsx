import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import {AppContext} from "@/ReactAPM/App";
import {useContext} from "react";


export default function Help() {
  const appContext = useContext(AppContext);
  document.title = 'About/Help';

  return (
    <NormalPageContainer>
      <h1>About</h1>

      <p>This is APM version <b>{appContext.versionTag}</b></p>

      <p>
        APM is open source software developed at the <a href={'https://thomasinstitut.uni-koeln.de/'} title={'Thomas-Institut'}>Thomas-Institut</a> of the <a href={'https://uni-koeln.de'} title={"Uni Köln"}>University of Cologne</a>.
        It is the main tool for the creation of transcriptions and critical editions in the <a href="https://averroes.uni-koeln.de" title={'Averroes Project'}>Averroes Project</a>.
      </p><p>
        Code and further technical information can be found in the project's <a href="https://github.com/thomas-institut/apm/" title={"APM's Github Page"}>GitHub page</a>.
      </p>

      <h4 style={{marginTop: '1em'}}>How to get help</h4>
      <ul>
        <li>User guides can be found in the APM's wiki: <a href={'https://averroes.uni-koeln.de/apm/wiki'}>https://averroes.uni-koeln.de/apm/wiki</a></li>
        <li>If your question or concern is not addressed in the Wiki, or if you found a problem you want to report,
          please create an issue on Github: <a href={'https://github.com/thomas-institut/apm/issues'}>https://github.com/thomas-institut/apm/issues</a></li>
      </ul>
    </NormalPageContainer>
  )
}