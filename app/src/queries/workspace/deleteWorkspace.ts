import { gql } from 'graphql.macro';

export default gql`
  mutation DeleteWorkspace($id: ID!) {
    deleteWorkspace(id: $id)
  }
`;
