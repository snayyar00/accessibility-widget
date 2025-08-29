import { gql } from '@apollo/client';

const CHANGE_CURRENT_WORKSPACE = gql`
  mutation ChangeCurrentWorkspace($workspaceId: Int, $userId: Int) {
    changeCurrentWorkspace(workspaceId: $workspaceId, userId: $userId)
  }
`;

export default CHANGE_CURRENT_WORKSPACE;
