import { gql } from 'graphql.macro';

export default gql`
  query GetPlanBySiteIdAndUserId($siteId: Int!) {
    getPlanBySiteIdAndUserId(siteId: $siteId) {
      id,
      siteId,
      productId,
      priceId,
      subcriptionId,
      customerId,
      isTrial,
      expiredAt,
      isActive,
      createdAt,
      updatedAt,
      deletedAt,
      siteName,
      productType,
      amount,
      priceType
    }
  }
`;
