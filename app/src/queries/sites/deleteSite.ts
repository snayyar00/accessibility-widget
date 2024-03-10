import { gql } from 'graphql.macro';

export default gql`
  mutation deleteSite($url: String!) {
    deleteSite(url:$url)
  }
`;