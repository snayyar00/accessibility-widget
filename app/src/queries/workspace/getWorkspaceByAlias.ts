import { gql } from '@apollo/client';

const GET_WORKSPACE_BY_ALIAS = gql`
  query GetWorkspaceByAlias($alias: String!) {
    getWorkspaceByAlias(alias: $alias) {
      id
      name
      alias
      organization_id
      domains {
        id
        url
        added_by_user_id
        added_by_user_email
        site_owner_user_id
        site_owner_user_email
      }
    }
  }
`;

export default GET_WORKSPACE_BY_ALIAS;
