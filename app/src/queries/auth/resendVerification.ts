import { gql } from '@apollo/client';

const RESEND_VERIFICATION = gql`
  mutation ResendVerification {
    resendEmail(type: VERIFY_EMAIL)
  }
`;

export default RESEND_VERIFICATION;
