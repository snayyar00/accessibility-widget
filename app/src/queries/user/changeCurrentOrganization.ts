import { gql } from 'graphql.macro';

export default gql`
  mutation ChangeCurrentOrganization($organizationId: Int!) {
    changeCurrentOrganization(organizationId: $organizationId)
  }
`;
