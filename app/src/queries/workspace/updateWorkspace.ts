import { gql } from 'graphql.macro';

export default gql`
  mutation UpdateWorkspace($id: ID!, $name: String) {
    updateWorkspace(id: $id, name: $name) {
      id
      name
      alias
      organization_id
    }
  }
`;
