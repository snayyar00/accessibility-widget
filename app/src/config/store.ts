import { configureStore } from '@reduxjs/toolkit';
import rootReducer from '@/features/rootReducer';
import { loadState, saveState } from '@/utils/localStorage';
import { IS_LOCAL } from '@/config/env';

const VALID_LOGIN_METHODS = ['email', 'google'] as const;

function getValidatedPreloadedState() {
  const loaded = loadState();
  if (!loaded) return undefined;

  // Validate and sanitize authPreferences for backward compatibility and corrupted data
  if (loaded.authPreferences && typeof loaded.authPreferences === 'object') {
    const { lastLoginMethod } = loaded.authPreferences;
    const isValid =
      typeof lastLoginMethod === 'string' &&
      (VALID_LOGIN_METHODS as readonly string[]).includes(lastLoginMethod);
    if (!isValid) {
      loaded.authPreferences = { lastLoginMethod: null };
    }
  }

  return loaded;
}

const preloadedState = getValidatedPreloadedState();

const store = configureStore({
  reducer: rootReducer,
  preloadedState,
});

store.subscribe(() => {
  saveState({
    report: store.getState().report,
    whatsNew: store.getState().whatsNew,
    authPreferences: store.getState().authPreferences,
  });
});

if (IS_LOCAL && module.hot) {
  module.hot.accept('../features/rootReducer', () => {
    const newRootReducer = rootReducer;
    store.replaceReducer(newRootReducer);
  });
}

export type RootState = ReturnType<typeof store.getState>;

export default store;
