import { gql } from 'graphql.macro';

export default gql`
  query GetWorkspaceInvitationsByAlias($alias: String!) {
    getWorkspaceInvitationsByAlias(alias: $alias) {
      workspace_name
      invited_by
      email
      status
      role
      valid_until
      organization_id
      workspace_id
      token
    }
  }
`;
