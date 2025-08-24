import { gql } from 'graphql.macro';

export default gql`
  mutation CreateWorkspace($name: String!) {
    createWorkspace(name: $name) {
      id
      name
      alias
      organization_id
    }
  }
`;
