import { gql } from 'graphql.macro';

export default gql`
  mutation UploadOrganizationLogo($organizationId: ID!, $logo: Upload!) {
    uploadOrganizationLogo(organizationId: $organizationId, logo: $logo) {
      id
      name
      logo_url
    }
  }
`;
