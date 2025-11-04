import { gql } from '@apollo/client';

const JOIN_INVITATION = gql`
  mutation JoinInvitation($token: String!, $type: String) {
    joinInvitation(token: $token, type: $type)
  }
`;

export default JOIN_INVITATION;
