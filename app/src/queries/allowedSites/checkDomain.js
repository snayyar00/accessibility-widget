import { gql } from '@apollo/client';

const checkDomainQuery = gql`
  query IsDomainAlreadyAdded($url: String!) {
    isDomainAlreadyAdded(url: $url)
  }
`;

export default checkDomainQuery; 