import { gql } from 'graphql.macro';

export default gql`
  query GetOrganizationByDomain {
    getOrganizationByDomain {
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
