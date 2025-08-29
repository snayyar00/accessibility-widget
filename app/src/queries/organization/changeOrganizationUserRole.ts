import { gql } from 'graphql.macro';

export default gql`
  mutation ChangeOrganizationUserRole(
    $userId: Int!
    $role: OrganizationUserRole!
  ) {
    changeOrganizationUserRole(userId: $userId, role: $role)
  }
`;
