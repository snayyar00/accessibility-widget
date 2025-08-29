import { gql } from 'graphql.macro';

export default gql`
  mutation RemoveWorkspaceInvitation($id: ID!) {
    removeWorkspaceInvitation(id: $id)
  }
`;
