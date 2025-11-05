import { gql } from 'graphql.macro';

export default gql`
  query fetchDashboardQuery(
    $url: String!
    $startDate: String!
    $endDate: String!
  ) {
    getSiteVisitorsByURL(url: $url, startDate: $startDate, endDate: $endDate) {
      count
    }

    getImpressionsByURLAndDate(
      url: $url
      startDate: $startDate
      endDate: $endDate
    ) {
      impressions {
        widget_opened
        widget_closed
        createdAt
        id
        site_id
        profileCounts
      }
    }

    getEngagementRates(url: $url, startDate: $startDate, endDate: $endDate) {
      totalEngagements
      totalImpressions
      engagementRate
      date
    }
  }
`;
