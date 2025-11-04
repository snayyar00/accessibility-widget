import { gql } from 'graphql.macro';

export default gql`
  query getEngagement($url: String!, $startDate: String!, $endDate: String!) {
    getEngagementRates(url: $url, startDate: $startDate, endDate: $endDate) {
      totalEngagements
      totalImpressions
      engagementRate
      date
    }
  }
`;

