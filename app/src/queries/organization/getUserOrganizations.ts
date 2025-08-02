import { gql } from 'graphql.macro';

export default gql`
  query getUserOrganizations {
    getUserOrganizations {
      id
      name
      domain
      logo_url
      settings
      created_at
      updated_at
    }
  }
`;
