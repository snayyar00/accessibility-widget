import { gql } from 'graphql.macro';

export default gql`
  query getVisitorCount($url: String!, $startDate: String!, $endDate: String!) {
    getSiteVisitorsByURL(url: $url, startDate: $startDate, endDate: $endDate) {
      count
    }
  }
`;

