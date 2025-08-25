import { gql } from 'graphql.macro';

export default gql`
  mutation ChangeOrganizationUserRole($userId: Int!, $role: String!) {
    changeOrganizationUserRole(userId: $userId, role: $role)
  }
`;
