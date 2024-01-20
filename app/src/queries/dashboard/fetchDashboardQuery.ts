import { gql } from 'graphql.macro';

export default gql`
  query fetchDashboardQuery($url: String!, $startDate: String!, $endDate: String!) {
    getSiteVisitorsByURLAndDate(url: $url, startDate: $startDate, endDate: $endDate) {
        count
      }
    
    getImpressionsByURLAndDate(url: $url, startDate: $startDate, endDate: $endDate){
        impressions{
            widget_opened,
            widget_closed,
            createdAt,
            id
        }
    }

    getEngagementRates(url: $url, startDate: $startDate, endDate: $endDate){
      totalEngagements,
      totalImpressions
      engagementRate,
      date
    }


  }
`;
