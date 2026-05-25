import {useRef} from "react";
import {ApiClient} from "@/Api/ApiClient";
import {InlineAppConfig} from "@/main";
import "./app.css";
import {QueryClient, useQuery} from "@tanstack/react-query";
import {AppConfig} from "@/Api/Schema/GetAppConfig";
import {Container} from "react-bootstrap";

interface AppProps {
  inlineConfig: InlineAppConfig;
}

export function App({inlineConfig}: AppProps) {

  const queryClient = new QueryClient();

  const apiClient = useRef<ApiClient | null>(null);
  if (!apiClient.current && inlineConfig.apiBaseUrl) {
    apiClient.current = new ApiClient().withBaseUrl(inlineConfig.apiBaseUrl);
  }

  const getAppConfigResult = useQuery({
    queryKey: ['getAppConfig'], queryFn: async () => {
      const clientResponse = await apiClient.current?.getAppConfig();
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


  if (getAppConfigResult.isLoading) {
    return <Container>Loading...</Container>;
  }

  if (getAppConfigResult.error) {
    return <Container><span className="text-danger">Could not load app config from server</span></Container>;
  }

  const appConfig: AppConfig = getAppConfigResult.data!;

  return <Container>App content will be here... { `${appConfig.name}, ${appConfig.version} (${appConfig.versionDate})` }</Container>





}
