import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {WebStorageKeyCache} from "@/toolbox/KeyCache/WebStorageKeyCache";
import {ApmDataProxy} from "@/pages/common/ApmDataProxy";
import {setBaseUrl} from "@/pages/common/SiteUrlGen";
import {DataId_EC_ViewOptions} from "@/constants/WebStorageDataId";
import {setSiteLanguage} from "@/pages/common/SiteLang";
import {ApmFormats} from "@/pages/common/ApmFormats";
import {BrowserRouter, Route, Routes, useLocation, useNavigate} from "react-router";
import Dashboard from "@/ReactAPM/Dashboard/Dashboard";
import Login from "@/ReactAPM/Login";
import {Context, createContext, lazy, useEffect, useRef, useState} from "react";
import NormalPageContainer from "@/ReactAPM/NormalPageContainer";
import TopBar from "@/ReactAPM/TopBar";

// @ts-ignore
const Works = lazy(() => import('./Works.js'));
// @ts-ignore
const People = lazy(() => import('./People.js'));
// @ts-ignore
const Search = lazy(() => import('./Search.js'));
// @ts-ignore
const Docs = lazy(() => import('./Docs.js'));

const AppSettingsUrl: string = "app-settings";
const ReactAppBaseUrl = '/new';
const ApmTokenKey = 'apm-token';
const DefaultSiteLanguage = 'en';


export interface AppContextProps {
  userId: number;
  userName: string;
  baseUrl: string;
  apiBaseUrl: string;
  reactAppBaseUrl: string,
  localCache: WebStorageKeyCache;
  dataProxy: ApmDataProxy;
}

const DefaultAppContext: AppContextProps = {
  userId: -1,
  userName: 'Guest',
  baseUrl: '',
  apiBaseUrl: '',
  reactAppBaseUrl: '',
  localCache: new WebStorageKeyCache('local', ''),
  dataProxy: new ApmDataProxy('', []),
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
  return (<BrowserRouter>
    <RealApp/>
  </BrowserRouter>);
}

export default App;

function RealApp() {

  const reactAppBaseUrl: string = ReactAppBaseUrl;
  const queryClient = new QueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState(StatusStart);
  const [firstRun, setFirstRun] = useState(true);

  const appSettingsLoader = async () => {
    const response = await fetch(AppSettingsUrl);
    return await response.json();
  };

  const appContext = useRef<AppContextProps>(DefaultAppContext);

  const initialize = () => {
    if (status !== StatusStart) {
      return;
    }
    setStatus(StatusLoadingSettings);
    appSettingsLoader().then(async (data) => {
      setStatus(StatusInitializing);
      const baseUrl: string = data.baseUrl;
      const apiBaseUrl: string = data.baseUrl + '/api';

      setBaseUrl(baseUrl, apiBaseUrl);
      const localCache = new WebStorageKeyCache('local', data.cacheDataId);
      const apmDataProxy = new ApmDataProxy(data.cacheDataId, [DataId_EC_ViewOptions]);
      setSiteLanguage(DefaultSiteLanguage);
      ApmFormats.setLanguage(DefaultSiteLanguage);

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      ApmFormats.setTimeZone(timeZone);

      console.log(`Client timezone is '${timeZone}', currently ${ApmFormats.getTimeZoneOffsetStringForDate(new Date(), false, false)}`);
      await apmDataProxy.initialize();
      apmDataProxy.withBearerAuthentication(() => {
        return Promise.resolve(localCache.retrieve(ApmTokenKey));
      }, async (token: string, ttl: number) => {
        await localCache.store(ApmTokenKey, token, ttl);
      });
      appContext.current = {
        userId: -1,
        userName: 'Guest',
        baseUrl: baseUrl,
        apiBaseUrl: apiBaseUrl,
        reactAppBaseUrl: reactAppBaseUrl,
        localCache: localCache,
        dataProxy: apmDataProxy,
      };
      setStatus(StatusInitializationReady);
      setFirstRun(false);
    }).catch((error) => {
      console.log(`Error loading app settings: ${error}`);
      setStatus(StatusErrorLoadingSettings);
    });
  };

  const checkAuthentication = async () => {
    const firingStates = [StatusInitializationReady, StatusReady];
    if (!firstRun && !firingStates.includes(status)) {
      return;
    }

    setStatus(StatusCheckingAuthentication);
    try {
      const userData = await appContext.current.dataProxy.whoAmI();
      if (userData === null) {
        console.log('User is not authenticated');
        setStatus(StatusReady);
        navigate(`${reactAppBaseUrl}/login`);
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
    appContext.current.localCache.delete(ApmTokenKey).then( ()=>{
      navigate(reactAppBaseUrl);
    });
  }

  const isLoginPage = location.pathname === `${reactAppBaseUrl}/login`;

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
            {!isLoginPage && (<TopBar style={{flexGrow: 0}} onLogout={handleLogout}/>)}
            <Routes>
              <Route path={`${reactAppBaseUrl}/`} element={<Dashboard/>}/>
              <Route path={`${reactAppBaseUrl}/docs`} element={<Docs/>}/>
              <Route path={`${reactAppBaseUrl}/works`} element={<Works/>}/>
              <Route path={`${reactAppBaseUrl}/people`} element={<People/>}/>
              <Route path={`${reactAppBaseUrl}/search`} element={<Search/>}/>
              <Route path={`${reactAppBaseUrl}/login`} element={<Login/>}/>
            </Routes>
          </div>
          )
        </QueryClientProvider>
      </AppContext>);

  }
}