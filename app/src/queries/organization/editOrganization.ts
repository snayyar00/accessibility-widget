import { gql } from 'graphql.macro';

export default gql`
  mutation EditOrganization(
    $id: ID!
    $name: String
    $logo_url: String
    $favicon: String
    $toggle_referral_program: Boolean
    $smtp_host: String
    $smtp_port: Int
    $smtp_secure: Boolean
    $smtp_user: String
    $smtp_password: String
  ) {
    editOrganization(
      id: $id
      name: $name
      logo_url: $logo_url
      favicon: $favicon
      toggle_referral_program: $toggle_referral_program
      smtp_host: $smtp_host
      smtp_port: $smtp_port
      smtp_secure: $smtp_secure
      smtp_user: $smtp_user
      smtp_password: $smtp_password
    ) {
      id
      name
      domain
      logo_url
      favicon
      settings
      toggle_referral_program
      smtp_host
      smtp_port
      smtp_secure
      smtp_user
      created_at
      updated_at
    }
  }
`;
