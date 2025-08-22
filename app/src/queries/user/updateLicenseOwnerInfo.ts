import { gql } from 'graphql.macro';

export default gql`
  mutation UpdateLicenseOwnerInfo(
    $name: String
    $license_owner_email: String
    $phone_number: String
  ) {
    updateLicenseOwnerInfo(
      name: $name
      license_owner_email: $license_owner_email
      phone_number: $phone_number
    )
  }
`;
