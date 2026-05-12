import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '@/App/App';

export interface AppConfig {
  baseUrl?: string;
}

const config: AppConfig = (window as any).APP_CONFIG || {
  baseUrl: null
};

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App config={config}/>
    </StrictMode>,
  );
}
