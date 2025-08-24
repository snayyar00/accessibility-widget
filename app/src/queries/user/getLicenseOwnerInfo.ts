import { gql } from 'graphql.macro';

export default gql`
  query GetLicenseOwnerInfo {
    getLicenseOwnerInfo {
      id
      name
      license_owner_email
      phone_number
    }
  }
`;
