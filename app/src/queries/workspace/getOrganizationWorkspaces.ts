import { gql } from 'graphql.macro';

export default gql`
  query GetOrganizationWorkspaces {
    getOrganizationWorkspaces {
      id
      name
      alias
      domains {
        id
        url
      }
      members {
        id
        user_id
        workspace_id
        role
        status
        created_at
        updated_at
        user {
          id
          name
          email
          avatarUrl
        }
      }
    }
  }
`;
