import { gql } from 'graphql.macro';

export default gql`
  mutation EditOrganization(
    $id: ID!
    $name: String
    $logo_url: String
    $favicon: String
    $toggle_referral_program: Boolean
  ) {
    editOrganization(
      id: $id
      name: $name
      logo_url: $logo_url
      favicon: $favicon
      toggle_referral_program: $toggle_referral_program
    ) {
      id
      name
      domain
      logo_url
      favicon
      settings
      toggle_referral_program
      created_at
      updated_at
    }
  }
`;
