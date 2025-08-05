import { gql } from 'graphql.macro';

export default gql`
  mutation RemoveUserFromOrganization($userId: Int!) {
    removeUserFromOrganization(userId: $userId)
  }
`;
