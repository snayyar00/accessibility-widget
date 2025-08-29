import { gql } from '@apollo/client';

const GET_ALL_USER_SITES = gql`
  query GetAllUserSites {
    getAllUserSites {
      id
      user_id
      url
      createAt
      updatedAt
      expiredAt
      trial
    }
  }
`;

export default GET_ALL_USER_SITES;
