import { gql } from '@apollo/client';

const CHANGE_WORKSPACE_MEMBER_ROLE = gql`
  mutation ChangeWorkspaceMemberRole(
    $alias: String!
    $userId: ID!
    $role: WorkspaceUserRole!
  ) {
    changeWorkspaceMemberRole(alias: $alias, userId: $userId, role: $role)
  }
`;

export default CHANGE_WORKSPACE_MEMBER_ROLE;
