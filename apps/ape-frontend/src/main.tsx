import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '@/App/App';
import 'bootstrap/dist/css/bootstrap.css'

export interface InlineAppConfig {
  apiBaseUrl?: string;
  appName?: string;
}

const config: InlineAppConfig = (window as any).APP_CONFIG || {
  apiBaseUrl: null,
  appName: 'DARE'
};

const name = config.appName ?? 'APE';

document.title = `${name} loading...`;

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App inlineConfig={config}/>
    </StrictMode>,
  );
}
