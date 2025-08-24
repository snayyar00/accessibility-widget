import { gql } from 'graphql.macro';

export default gql`
  mutation InviteMember($type: JoinWorkspaceType!, $token: String!) {
    joinWorkspace(type: $type, token: $token)
  }
`;
