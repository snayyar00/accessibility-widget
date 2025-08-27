import { gql } from '@apollo/client';

const GET_WORKSPACE_BY_ALIAS = gql`
  query GetWorkspaceByAlias($alias: String!) {
    getWorkspaceByAlias(alias: $alias) {
      id
      name
      alias
      organization_id
    }
  }
`;

export default GET_WORKSPACE_BY_ALIAS;
