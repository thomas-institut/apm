import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '@/App/App';

export interface AppConfig {
  apiBaseUrl?: string;
  appName?: string;
}

const config: AppConfig = (window as any).APP_CONFIG || {
  apiBaseUrl: null,
  appName: 'APE'
};

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App config={config}/>
    </StrictMode>,
  );
}
