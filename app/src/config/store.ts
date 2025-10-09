import { configureStore } from '@reduxjs/toolkit';
import rootReducer from '@/features/rootReducer';
import { loadState, saveState } from '@/utils/localStorage';
import { IS_LOCAL } from '@/config/env';

// Initialize store without preloaded state first
const store = configureStore({
  reducer: rootReducer,
});

// Load state asynchronously from cache (non-blocking)
loadState().then((preloadedState) => {
  if (preloadedState) {
    // Merge loaded state with current state
    Object.keys(preloadedState).forEach((key) => {
      const currentState = store.getState();
      if (currentState[key] !== undefined) {
        // Only restore if the slice exists in current state
        try {
          store.dispatch({ type: `${key}/restore`, payload: preloadedState[key] });
        } catch (err) {
          console.debug(`Could not restore ${key} slice, using defaults`);
        }
      }
    });
    console.log('✅ Redux state restored from cache');
  }
}).catch((error) => {
  console.debug('State loading skipped:', error);
});

// Debounce save to avoid excessive API calls
let saveTimeout: NodeJS.Timeout;
store.subscribe(() => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveState({
      report: store.getState().report,
      whatsNew: store.getState().whatsNew,
      // Add other slices here if you want to persist more
    });
  }, 1000); // Debounce 1 second
});

if (IS_LOCAL && module.hot) {
  module.hot.accept('../features/rootReducer', () => {
    const newRootReducer = rootReducer;
    store.replaceReducer(newRootReducer);
  });
}

export type RootState = ReturnType<typeof store.getState>;

export default store;
