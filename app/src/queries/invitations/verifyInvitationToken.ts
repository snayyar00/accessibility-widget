import { gql } from '@apollo/client';

const VERIFY_INVITATION_TOKEN = gql`
  query VerifyInvitationToken($invitationToken: String!) {
    verifyInvitationToken(invitationToken: $invitationToken) {
      id
      workspace_name
      workspace_alias
      organization_name
      invited_by
      email
      status
      role
      valid_until
      organization_id
      workspace_id
      token
      type
      created_at
    }
  }
`;

export default VERIFY_INVITATION_TOKEN;
