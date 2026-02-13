import { gql } from 'graphql.macro';

export default gql`
  mutation LoginWithGoogle($idToken: String!) {
    loginWithGoogle(idToken: $idToken) {
      token
      url
    }
  }
`;