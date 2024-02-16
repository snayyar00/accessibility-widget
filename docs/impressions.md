# You should refer this document to understand how to use the impressions gql queries

## Queries

### getImpressionsByURL
#### Parameters:
    url (String!): The URL for which impressions are to be retrieved.
    Returns: An ImpressionList object containing a list of impressions and a count.
#### Example Query:

```graphql

    query {
    getImpressionsByURL(url: "https://example.com") {
        impressions {
        id
        site_id
        visitor_id
        widget_opened
        widget_closed
        createdAt
        }
        count
    }
    }
```
### getImpressionsBySiteId
#### Parameters:
    siteId (Int!): The ID of the site for which impressions are to be retrieved.
#### Returns: An ImpressionList object.
#### Example Query:
```graphql

query {
  getImpressionsBySiteId(siteId: 123) {
    impressions {
      id
      site_id
      visitor_id
      widget_opened
      widget_closed
      createdAt
    }
    count
  }
}
```
### getEngagementRates
#### Parameters:
url (String!): The URL for which engagement rates are to be retrieved.
startDate (String): The start date for the range.
endDate (String): The end date for the range.
Returns: A list of engagementRate objects.
### Example Query:
```graphql

query {
  getEngagementRates(url: "https://example.com", startDate: "2024-01-01", endDate: "2024-01-31") {
    engagementRate
    date
  }
}
```
### getImpressionsByURLAndDate
#### Parameters:
url (String!): The URL for which impressions are to be retrieved.
startDate (String!): The start date for the range.
endDate (String!): The end date for the range.
#### Returns: An ImpressionList object.
#### Example Query:
```
query {
  getImpressionsByURLAndDate(url: "https://example.com", startDate: "2024-01-01", endDate: "2024-01-31") {
    impressions {
      id
      site_id
      visitor_id
      widget_opened
      widget_closed
      createdAt
    }
    count
  }
}
```

### Mutations
addImpression
#### Parameters:
siteId (Int!): The ID of the site for which an impression is to be added.
Returns: An array of integers.
#### Example Mutation:
```
mutation {
  addImpression(siteId: 123)
}
```
### addImpressionsURL

#### Parameters:
url (String): The URL for which impressions are to be added.
Returns: An array of integers.
#### Example Mutation:
```

mutation {
  addImpressionsURL(url: "https://example.com")
}
```

### registerInteraction
#### Parameters:
impressionId (Int!): The ID of the impression for which an interaction is being registered.
interaction (String!): The type or nature of the interaction to be registered.
#### Returns: An integer.
#### Example Mutation:
```
mutation {
  registerInteraction(impressionId: 1, interaction: "widgetOpened") 
}

Possible values of interaction can be widgetOpened or widgetClosed

```

### Types

Impression
Fields:
id: (Int!) Unique identifier of the impression.
site_id: (Int!) ID of the site related to the impression.
visitor_id: (Int!) ID of the visitor who made the impression.
widget_opened: (Boolean!) Indicates if the widget was opened.
widget_closed: (Boolean!) Indicates if the widget was closed.
createdAt: (String!) Timestamp of when the impression was created.
ImpressionUpdateResponse
Fields:
success: (Boolean!) Indicates the success status of the operation.
message: (String!) Description or message about the operation.
ImpressionList
Fields:
impressions: ([Impression]!) An array of Impression objects.
count: (Int!) The total count of impressions.
engagementRate
**Fields
**:

engagementRate: (Float) The rate of engagement for a particular URL or period.
date: (String) The date for which the engagement rate is calculated.