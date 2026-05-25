import {createContext, useRef} from "react";
import {ApiClient} from "@/Api/ApiClient";
import {InlineAppConfig} from "@/main";
import "./app.css";
import {QueryClient, QueryClientProvider, useQuery} from "@tanstack/react-query";
import {AppConfig} from "@/Api/Schema/GetAppConfig";
import {Breadcrumb, Container} from "react-bootstrap";
import NormalPageLayout from "@/ui/NormalPageLayout";
import {BrowserRouter, Link, Route, Routes} from "react-router";

interface AppProps {
    inlineConfig: InlineAppConfig
}

export interface ApeContextProps {
    apiClient?: ApiClient;
    appConfig?: AppConfig;
}

export const ApeContext = createContext<ApeContextProps>({});


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

    if (getAppConfigResult.data === null || getAppConfigResult.data === undefined) {
        return <Container><span className="text-danger">Could not load app config from server</span></Container>;
    }
    const appConfig = getAppConfigResult.data;

    if (apiClient.current === null) {
        return <Container><span className="text-danger">Error loading app</span></Container>;
    }

    document.title = `${appConfig.shortName}`;

    const context: ApeContextProps = {
        apiClient: apiClient.current, appConfig,
    }

    return (<ApeContext value={context}>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <NormalPageLayout>
                    <Routes>
                        <Route path="/" element={<div>Home page will be here</div>}/>
                        <Route path="/info" element={
                            <>
                                <Breadcrumb>
                                    <Breadcrumb.Item linkAs={Link} linkProps={{to: "/"}}>Home</Breadcrumb.Item>
                                    <Breadcrumb.Item active>Info</Breadcrumb.Item>
                                </Breadcrumb>
                                <div>
                                    This is {appConfig.name}, {appConfig.version} ({appConfig.versionDate})
                                </div>
                            </>
                        }/>
                    </Routes>
                </NormalPageLayout>
            </BrowserRouter>
        </QueryClientProvider>
    </ApeContext>)
}
