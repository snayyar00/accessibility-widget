import { gql } from 'graphql.macro';

export default gql`
  mutation UpdateWorkspace($id: ID!, $name: String, $allowedSiteIds: [ID!]) {
    updateWorkspace(id: $id, name: $name, allowedSiteIds: $allowedSiteIds) {
      id
      name
      alias
      organization_id
      domains {
        id
        url
      }
    }
  }
`;
