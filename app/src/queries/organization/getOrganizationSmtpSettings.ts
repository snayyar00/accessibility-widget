import { gql } from 'graphql.macro';

export default gql`
  query GetOrganizationSmtpSettings($organizationId: ID!) {
    organizationSmtpSettings(organizationId: $organizationId) {
      smtp_host
      smtp_port
      smtp_secure
      smtp_user
    }
  }
`;
