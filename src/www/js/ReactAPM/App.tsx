import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {WebStorageKeyCache} from "@/toolbox/KeyCache/WebStorageKeyCache";
import {ApmApiClient} from "@/Api/ApmApiClient";
import {setBaseUrl} from "@/pages/common/SiteUrlGen";
import {DataId_EC_ViewOptions} from "@/constants/WebStorageDataId";
import {setSiteLanguage} from "@/pages/common/SiteLang";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {BrowserRouter, Route, Routes, useLocation, useMatch, useNavigate} from "react-router";
import Login from "@/ReactAPM/Login";
import {Context, createContext, lazy, StrictMode, useEffect, useRef, useState} from "react";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import TopBar from "@/ReactAPM/TopBar";
import {RouteUrls} from './Router/RouteUrls';
import {deleteToken, retrieveToken, storeToken} from "@/ReactAPM/ToolBox/AuthenticationUtilities";
import {trimCharacters} from "@/toolbox/Util.mjs";

// @ts-ignore
const Dashboard = lazy(() => import('@/ReactAPM/Pages/Dashboard/Dashboard.js'));
// @ts-ignore
const Works = lazy(() => import('./Pages/Works/Works.js'));
// @ts-ignore
const People = lazy(() => import('./Pages/People/People.js'));
// @ts-ignore
const Search = lazy(() => import('./Pages/Search.js'));
// @ts-ignore
const Docs = lazy(() => import('@/ReactAPM/Pages/Docs/Docs.js'));
// @ts-ignore
const MultiChunkEdition = lazy(() => import('./Pages/MultiChunkEdition.js'));
// @ts-ignore
const Work = lazy(() => import('./Pages/Work.js'));
// @ts-ignore
const Chunk = lazy(() => import('./Pages/Chunk.js'));
// @ts-ignore
const Person = lazy(() => import('./Pages/Person/Person.js'));
// @ts-ignore
const EditionComposer = lazy(() => import('./Pages/EditionComposer.js'));
// @ts-ignore
const Document = lazy(() => import('./Pages/Document.js'));


const AppSettingsUrl: string = "app-settings";
const ReactAppBaseUrlSuffix = '/beta';
const ApmTokenKey = 'apm-token';
const ApmTokenCookie = 'rme2';
const DefaultSiteLanguage = 'en';


export interface AppContextProps {
  userId: number;
  userName: string;
  baseUrl: string;
  apiBaseUrl: string;
  reactAppBaseUrl: string,
  localCache: WebStorageKeyCache;
  apiClient: ApmApiClient;
}

const DefaultAppContext: AppContextProps = {
  userId: -1,
  userName: 'Guest',
  baseUrl: '',
  apiBaseUrl: '',
  reactAppBaseUrl: ReactAppBaseUrlSuffix,
  localCache: new WebStorageKeyCache('local', ''),
  apiClient: new ApmApiClient('', []),
};
export const AppContext: Context<AppContextProps> = createContext(DefaultAppContext);

const StatusStart = 'Start';
const StatusLoadingSettings = 'Loading settings';
const StatusInitializing = 'Initializing app';
const StatusInitializationReady = 'Initialization ready';
const StatusCheckingAuthentication = 'Checking authentication';
const StatusErrorLoadingSettings = 'errorLoadingSettings';
const StatusErrorCheckingAuthentication = 'errorCheckingAuthentication';
const StatusNavigatingToLogin = 'navigatingToLogin';
const StatusReady = 'ready';


function App() {
  return (
    <StrictMode>
      <BrowserRouter>
        <RealApp/>
      </BrowserRouter>
    </StrictMode>
    );
}

export default App;

function RealApp() {


  const queryClient = new QueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(StatusStart);
  const [firstRun, setFirstRun] = useState(true);

  function getApmBasePathName(baseUrl: string): string {
    const url = new URL(baseUrl);
    return url.pathname;
  }

  const appSettingsLoader = async () => {
    const basePathName = trimCharacters(window.location.pathname, ['/']);
    const reactAppSuffix = trimCharacters(ReactAppBaseUrlSuffix, ['/']);

    const subDirs = basePathName.split('/');
    const reactSuffixIndex = subDirs.indexOf(reactAppSuffix);
    if (reactSuffixIndex === -1) {
      throw new Error(`React app base URL '${ReactAppBaseUrlSuffix}' not found in path '${basePathName}'`);
    }
    const appSettingsPath = (reactSuffixIndex === 0 ? '' : ('/' + subDirs.slice(0, reactSuffixIndex).join('/'))) + '/' + AppSettingsUrl;

    console.log(`Loading app settings from ${appSettingsPath}`);
    const response = await fetch(appSettingsPath);
    return await response.json();
  };

  const appContext = useRef<AppContextProps>(DefaultAppContext);

  const initialize = () => {
    if (status !== StatusStart) {
      return;
    }
    setStatus(StatusLoadingSettings);
    appSettingsLoader().then(async (data) => {
      console.log(`Loaded app settings`, data);
      setStatus(StatusInitializing);
      const baseUrl: string = data.baseUrl;
      const apiBaseUrl: string = data.baseUrl + '/api';
      const apmBasePathName: string = getApmBasePathName(baseUrl);

      const reactAppBaseUrl: string = (apmBasePathName === '/' ? '' : apmBasePathName) + ReactAppBaseUrlSuffix;
      console.log(`React app base URL is '${reactAppBaseUrl}'`);

      setBaseUrl(baseUrl, apiBaseUrl);
      const localCache = new WebStorageKeyCache('local', data.cacheDataId);
      const apmDataProxy = new ApmApiClient(data.cacheDataId, [DataId_EC_ViewOptions]);
      setSiteLanguage(DefaultSiteLanguage);
      ApmFormats.setLanguage(DefaultSiteLanguage);

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      ApmFormats.setTimeZone(timeZone);

      console.log(`Client timezone is '${timeZone}', currently ${ApmFormats.getTimeZoneOffsetStringForDate(new Date(), false, false)}`);
      await apmDataProxy.initialize();
      apmDataProxy.withBearerAuthentication(async () => retrieveToken(localCache, ApmTokenKey, ApmTokenCookie),

        async (token: string, ttl: number) => storeToken(localCache, ApmTokenKey, token, ttl, ApmTokenCookie));
      appContext.current = {
        userId: -1,
        userName: 'Guest',
        baseUrl: baseUrl,
        apiBaseUrl: apiBaseUrl,
        reactAppBaseUrl: reactAppBaseUrl,
        localCache: localCache,
        apiClient: apmDataProxy,
      };
      RouteUrls.setBaseUrl(reactAppBaseUrl);
      setStatus(StatusInitializationReady);
      setFirstRun(false);
    }).catch((error) => {
      console.log(`Error loading app settings: ${error}`);
      setStatus(StatusErrorLoadingSettings);
    });
  };

  const checkAuthentication = async () => {
    // console.log(`Checking authentication, status is ${status} and firstRun is ${firstRun}`);
    const firingStates = [StatusInitializationReady, StatusReady];
    if (!firingStates.includes(status)) {
      return;
    }

    if (status !== StatusReady) {
      // only change the state when initializing... when status is StatusReady this function
      // will run in the background and will either navigate to login or finish silently
      setStatus(StatusCheckingAuthentication);
    }

    try {
      const userData = await appContext.current.apiClient.whoAmI();
      if (userData === null) {
        console.log('User is not authenticated');
        console.log('Navigating to login', RouteUrls.login());
        navigate(RouteUrls.login());
        setStatus(StatusNavigatingToLogin);
      } else {
        appContext.current.userId = userData.id;
        appContext.current.userName = userData.name;
        setStatus(StatusReady);
      }
    } catch (error) {
      console.log(`Error checking authentication: ${error}`);
      setStatus(StatusErrorCheckingAuthentication);
    }
  };

  useEffect(() => {
    initialize();
  });

  useEffect(() => {
    checkAuthentication().then();
  }, [firstRun, location.pathname, navigate]);

  const handleLogout = () => {
    deleteToken(appContext.current.localCache, ApmTokenKey, ApmTokenCookie);
    navigate(RouteUrls.login());
  };


  const routesWithTopBar = [RouteUrls.home(), RouteUrls.docs(),

    RouteUrls.works(), RouteUrls.people(), RouteUrls.search(),

    RouteUrls.patternPerson(), RouteUrls.patternWork(), RouteUrls.patternChunk(), RouteUrls.patternDocument(),

  ];

  const routeMatches = routesWithTopBar.map(path => useMatch(path));
  const routeShouldHaveTopBar = routeMatches.some(match => match !== null);

  switch (status) {
    case StatusStart:
    case StatusLoadingSettings:
    case StatusInitializing:
    case StatusInitializationReady:
    case StatusCheckingAuthentication:
      return (<NormalPageContainer>Loading...</NormalPageContainer>);


    case StatusErrorLoadingSettings:
      return (<div className="text-danger">Error loading settings</div>);

    case StatusErrorCheckingAuthentication:
      return (<div className="text-danger">Error checking authentication</div>);

    case StatusReady:
    case StatusNavigatingToLogin:
      return (<AppContext value={appContext.current}>
        <QueryClientProvider client={queryClient}>
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
          }}>
            {routeShouldHaveTopBar && (<TopBar style={{flexGrow: 0}} onLogout={handleLogout}/>)}
            <Routes>
              <Route id="home" path={RouteUrls.home()} element={<Dashboard/>}/>
              <Route id="home2" path={RouteUrls.homeWithTrailingSlash()} element={<Dashboard/>}/>
              <Route id="docs" path={RouteUrls.docs()} element={<Docs/>}/>
              <Route id="works" path={RouteUrls.works()} element={<Works/>}/>
              <Route id="people" path={RouteUrls.people()} element={<People/>}/>
              <Route id="search" path={RouteUrls.search()} element={<Search/>}/>
              <Route id="mce" path={RouteUrls.patternMultiChunkEdition()} element={<MultiChunkEdition/>}/>
              <Route id="ec" path={RouteUrls.patternSingleChunkEdition()} element={<EditionComposer/>}/>
              <Route id="ct" path={RouteUrls.patternCollationTable()} element={<EditionComposer/>}/>
              <Route id="chunk" path={RouteUrls.patternChunk()} element={<Chunk/>}/>
              <Route id="work" path={RouteUrls.patternWork()} element={<Work/>}/>
              <Route id="person" path={RouteUrls.patternPerson()} element={<Person/>}/>
              <Route id="doc" path={RouteUrls.patternDocument()} element={<Document/>}/>
              <Route id="login" path={RouteUrls.login()} element={<Login/>}/>
            </Routes>
          </div>
          )
        </QueryClientProvider>
      </AppContext>);

  }
}