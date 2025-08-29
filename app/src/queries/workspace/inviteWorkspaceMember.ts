import { gql } from 'graphql.macro';

export default gql`
  mutation InviteWorkspaceMember(
    $email: String!
    $workspaceId: ID!
    $role: WorkspaceUserRole!
  ) {
    inviteWorkspaceMember(
      email: $email
      workspaceId: $workspaceId
      role: $role
    ) {
      user_id
      user_name
      user_email
      status
    }
  }
`;
