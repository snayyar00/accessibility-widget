import { gql } from 'graphql.macro';

export default gql`
  query GetOrganizationByDomain {
    getOrganizationByDomain {
      id
      name
      domain
      favicon
      logo_url
      settings
      created_at
      updated_at
    }
  }
`;
