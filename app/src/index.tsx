import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { init, ErrorBoundary } from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { useQuery } from '@apollo/client';


import store from '@/config/store';
import App from './App';

import './index.css';

import './config/i18n';

// if (process.env.NODE_ENV === 'development') {
//   import("disable-react-error-overlay").then(() => {
//       const iframe = document.querySelector('iframe');
//       if (iframe) iframe.remove();
//   });
// }


const options = ["Option1", "Option2"];

// Initialize Sentry with tracing
init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [
    new Integrations.BrowserTracing({
      tracingOrigins: ['localhost', 'webability.io', 'app.webability.io', /^\//],
    }),
  ],
  // Adjust this sample rate in production to avoid affecting performance
  tracesSampleRate: 1.0,
  // Set environment
  environment: process.env.NODE_ENV || 'development',
  // Enable error captures including component boundaries
  attachStacktrace: true,
});

const render = () => {
  ReactDOM.render(
    <ErrorBoundary fallback="An error has occurred">
      <Provider store={store}>
        <App options={options} />
      </Provider>
    </ErrorBoundary>,
    document.getElementById('root')
  );
};

render();

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', render);
}
