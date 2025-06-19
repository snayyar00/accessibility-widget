import { gql } from 'graphql.macro';

export const ORGANIZATION_EXISTS = gql`
  query OrganizationExists($name: String!) {
    organizationExists(name: $name)
  }
`;
