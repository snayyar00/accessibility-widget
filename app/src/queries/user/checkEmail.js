import { gql } from '@apollo/client';

const checkEmailQuery = gql`
  query IsEmailAlreadyRegistered($email: String!) {
    isEmailAlreadyRegistered(email: $email)
  }
`;

export default checkEmailQuery; 