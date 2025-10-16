import { gql } from 'graphql.macro';

export default gql`
  mutation InviteUser(
    $type: InvitationType!
    $email: String!
    $role: String!
    $workspaceId: ID
  ) {
    inviteUser(
      type: $type
      email: $email
      role: $role
      workspaceId: $workspaceId
    ) {
      user_id
      user_name
      user_email
      status
    }
  }
`;
