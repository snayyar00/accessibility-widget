import { gql } from 'graphql.macro';

export default gql`
  mutation UploadOrganizationFavicon($organizationId: ID!, $favicon: Upload!) {
    uploadOrganizationFavicon(
      organizationId: $organizationId
      favicon: $favicon
    ) {
      id
      name
      favicon
    }
  }
`;
