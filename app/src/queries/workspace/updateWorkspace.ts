import { gql } from 'graphql.macro';

export default gql`
  mutation UpdateWorkspace($id: ID!, $name: String) {
    updateWorkspace(id: $id, name: $name) {
      id
      name
      alias
      organization_id
      domains {
        id
        url
        added_by_user_id
        added_by_user_email
        site_owner_user_id
        site_owner_user_email
      }
    }
  }
`;
