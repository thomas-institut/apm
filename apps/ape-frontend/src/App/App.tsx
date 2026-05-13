import {useRef} from "react";
import {ApiClient} from "@/Api/ApiClient";
import {AppConfig} from "@/main";
import "./app.css";
import {QueryClient, useQuery} from "@tanstack/react-query";
import {BackendInfo} from "@/Api/Schema/GetBackendInfo";
import {randomString} from "@shared/ts";

interface AppProps {
  config: AppConfig;
}

export function App({config}: AppProps) {

  const queryClient = new QueryClient();

  const apiClient = useRef<ApiClient | null>(null);
  if (!apiClient.current && config.apiBaseUrl) {
    apiClient.current = new ApiClient().withBaseUrl(config.apiBaseUrl);
  }

  const getBackendInfoResult = useQuery({
    queryKey: ['getBackendInfo'], queryFn: async () => {
      const clientResponse = await apiClient.current?.getBackendInfo();
      if (!clientResponse) {
        return null;
      }
      if (clientResponse.result === 'Error') {
        console.log('Error retrieving backend info:', clientResponse);
        return null;
      }
      if (!clientResponse.data) {
        return null;
      }
      return clientResponse.data;
    }, enabled: !!apiClient.current,
  }, queryClient);

  const appContent = (backendInfo: BackendInfo|null) => (<>
      <h1>App</h1>
      <div>The frontend for {config.appName} says 'Hello world!'</div>
    <div>This is a random string: {randomString()}</div>
    { backendInfo && <div>{backendInfo.name} {backendInfo.version} ({backendInfo.versionDate})</div>}
    { backendInfo === null && <div>Backend info: not available</div>}
    </>);

  if (getBackendInfoResult.isLoading) {
    return appContent(null);
  }

  if (getBackendInfoResult.error) {
    return appContent(null);
  }
  return appContent(getBackendInfoResult.data || null);

}
