import { gql } from 'graphql.macro';

export default gql`
  mutation EditOrganization(
    $id: ID!
    $name: String
    $logo_url: String
    $favicon: String
  ) {
    editOrganization(
      id: $id
      name: $name
      logo_url: $logo_url
      favicon: $favicon
    ) {
      id
      name
      domain
      logo_url
      favicon
      settings
      created_at
      updated_at
    }
  }
`;
