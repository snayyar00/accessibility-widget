import { gql } from 'graphql.macro';

export default gql`
  query GetWorkspaceMembersByAlias($alias: String!) {
    getWorkspaceMembersByAlias(alias: $alias) {
      id
      user_id
      workspace_id
      role
      status
      created_at
      updated_at
      invitationId
      user {
        id
        name
        email
        avatarUrl
      }
    }
  }
`;
