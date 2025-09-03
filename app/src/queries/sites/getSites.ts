import { gql } from 'graphql.macro';

export default gql`
  query GetUserSites {
    getUserSites{
      url,
      id,
      expiredAt,
      trial,
      monitor_enabled,
      status,
      monitor_priority,
      last_monitor_check,
      is_currently_down,
      monitor_consecutive_fails
    }
  }
`;
