import { gql } from 'graphql.macro';

export default gql`
  query getImpressions($url: String!, $startDate: String!, $endDate: String!) {
    getImpressionsByURLAndDate(url: $url, startDate: $startDate, endDate: $endDate) {
      impressions {
        widget_opened
        widget_closed
        createdAt
        id
        site_id
        profileCounts
      }
    }
  }
`;

