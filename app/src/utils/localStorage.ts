import { getCacheData, setCacheData } from './cacheApi';

/**
 * Load Redux state from Redis
 * Falls back to localStorage for backward compatibility
 */
export const loadState = async () => {
  try {
    // Try Redis first
    const cachedState = await getCacheData('reduxState', { prefix: 'redux' });
    if (cachedState) {
      console.log('✅ Redux state loaded from Redis');
      return cachedState;
    }
  } catch (redisErr) {
    console.warn('⚠️ Redis unavailable for state loading:', redisErr);
  }

  // Fallback to localStorage (always available)
  try {
    const localStorageState = localStorage.getItem('reduxState');
    if (localStorageState !== null) {
      const parsed = JSON.parse(localStorageState);
      console.log('✅ Redux state loaded from localStorage');
      
      // Try to migrate to Redis (non-blocking)
      setCacheData('reduxState', parsed, { 
        prefix: 'redux',
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days TTL
      }).then(() => {
        console.log('✅ State migrated to Redis');
      }).catch(() => {
        console.warn('⚠️ Redis unavailable, will retry migration later');
      });
      
      return parsed;
    }
  } catch (localErr) {
    console.error('Error loading state from localStorage:', localErr);
  }

  return undefined;
};

/**
 * Save Redux state to Redis with localStorage fallback
 */
export const saveState = async (state: any) => {
  // Always save to localStorage first (synchronous, reliable)
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('reduxState', serializedState);
  } catch (localError) {
    console.error('Error saving to localStorage:', localError);
  }

  // Try to save to Redis as well (async, optional)
  try {
    await setCacheData('reduxState', state, { 
      prefix: 'redux',
      ttl: 7 * 24 * 60 * 60 * 1000 // 7 days TTL
    });
  } catch (error) {
    // Silently fail - localStorage is primary
    console.debug('Redis save skipped (not critical):', error);
  }
}; 