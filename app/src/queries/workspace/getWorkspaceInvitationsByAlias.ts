import { gql } from 'graphql.macro';

export default gql`
  query GetWorkspaceInvitationsByAlias($alias: String!) {
    getWorkspaceInvitationsByAlias(alias: $alias) {
      id
      invited_by
      email
      status
      workspace_id
      created_at
    }
  }
`;
