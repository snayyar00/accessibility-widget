import { gql } from 'graphql.macro';

export default gql`
  mutation ChangeCurrentOrganization($organizationId: Int!, $userId: Int) {
    changeCurrentOrganization(organizationId: $organizationId, userId: $userId)
  }
`;
