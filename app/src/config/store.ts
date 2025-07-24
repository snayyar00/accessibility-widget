import { configureStore } from '@reduxjs/toolkit';
import rootReducer from '@/features/rootReducer';
import { loadState, saveState } from '@/utils/localStorage';
import { IS_LOCAL } from '@/config/env';

const preloadedState = loadState();

const store = configureStore({
  reducer: rootReducer,
  preloadedState,
});

store.subscribe(() => {
  saveState({
    report: store.getState().report,
    // Add other slices here if you want to persist more
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
