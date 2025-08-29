import { gql } from 'graphql.macro';

export default gql`
  query getUserWorkspaces {
    getUserWorkspaces {
      id
      name
      alias
      organization_id
    }
  }
`;
