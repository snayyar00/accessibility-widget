import { gql } from 'graphql.macro';

export default gql`
  mutation InviteWorkspaceMember(
    $email: String!
    $alias: String!
    $role: WorkspaceUserRole!
  ) {
    inviteWorkspaceMember(email: $email, alias: $alias, role: $role) {
      user_id
      user_name
      user_email
      status
    }
  }
`;
