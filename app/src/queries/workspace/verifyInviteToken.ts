import { gql } from 'graphql.macro';

export default gql`
  query VerifyInvitationToken($invitationToken: String!) {
    verifyWorkspaceInvitationToken(invitationToken: $invitationToken) {
      workspace_name
      invited_by
    }
  }
`;
