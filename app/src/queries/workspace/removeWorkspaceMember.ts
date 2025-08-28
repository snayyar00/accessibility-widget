import { gql } from 'graphql.macro';

export default gql`
  mutation RemoveWorkspaceMember($id: ID!) {
    removeWorkspaceMember(id: $id)
  }
`;
