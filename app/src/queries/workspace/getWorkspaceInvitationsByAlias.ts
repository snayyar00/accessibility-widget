import { gql } from 'graphql.macro';

export default gql`
  query GetWorkspaceInvitationsByAlias($alias: String!) {
    getWorkspaceInvitationsByAlias(alias: $alias) {
      id
      invited_by
      invited_by_id
      email
      status
      role
      workspace_id
      created_at
    }
  }
`;
