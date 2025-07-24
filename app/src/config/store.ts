import { configureStore } from '@reduxjs/toolkit';
import rootReducer from '@/features/rootReducer';
import { loadState, saveState } from '@/utils/localStorage';

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

if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('../features/rootReducer', () => {
    const newRootReducer = rootReducer;
    store.replaceReducer(newRootReducer);
  });
}

export type RootState = ReturnType<typeof store.getState>;

export default store;
