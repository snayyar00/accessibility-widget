import { gql } from 'graphql.macro';

export default gql`
  mutation AddWorkspaceDomains($workspaceId: ID!, $siteIds: [ID!]!) {
    addWorkspaceDomains(workspaceId: $workspaceId, siteIds: $siteIds) {
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
