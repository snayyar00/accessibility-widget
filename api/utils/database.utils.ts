/**
 * Utility function to check if ClickHouse is disabled
 * @returns {boolean} true if ClickHouse should be disabled and SQL should be used instead
 */
export function isClickHouseDisabled(): boolean {
  return process.env.CLICKHOUSE_DISABLE_FLAG === 'true'
}

/**
 * Utility function to get the appropriate database type string for logging
 * @returns {string} 'SQL' or 'ClickHouse' based on the current configuration
 */
export function getCurrentDatabaseType(): string {
  return isClickHouseDisabled() ? 'SQL' : 'ClickHouse'
}
