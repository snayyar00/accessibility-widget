import { gql } from 'graphql.macro';

export default gql`
  query getUserQuoteRequests {
    getUserQuoteRequests {
      id
      user_id
      project_name
      project_type
      project_details
      frequency
      project_links
      report_link
      status
      created_at
      updated_at
    }
  }
`;

