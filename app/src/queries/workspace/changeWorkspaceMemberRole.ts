import { gql } from '@apollo/client';

const CHANGE_WORKSPACE_MEMBER_ROLE = gql`
  mutation ChangeWorkspaceMemberRole($id: ID!, $role: WorkspaceUserRole!) {
    changeWorkspaceMemberRole(id: $id, role: $role)
  }
`;

export default CHANGE_WORKSPACE_MEMBER_ROLE;
