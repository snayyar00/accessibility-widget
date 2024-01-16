## Queries

### `getSiteVisitors`

- **Parameters**:
  - `siteId`: `Int!` - The ID of the site.
- **Returns**: `visitorResponse` - An object containing an array of `Visitor` objects and a count.
- **Example**:
  ```graphql
  query {
    getSiteVisitors(siteId: 123) {
      visitors {
        id
        siteId
        ipAddress
        // Other fields...
      }
      count
    }
  }


Certainly! Here's the documentation for the UniqueVisitorSchema in markdown format:

markdown
Copy code
## Queries

### `getSiteVisitors`

- **Parameters**:
  - `siteId`: `Int!` - The ID of the site.
- **Returns**: `visitorResponse` - An object containing an array of `Visitor` objects and a count.
- **Example**:
  ```graphql
  query {
    getSiteVisitors(siteId: 123) {
      visitors {
        id
        siteId
        ipAddress
        // Other fields...
      }
      count
    }
  }

getSiteVisitorsByIp
Parameters:
ipAddress: String! - The IP address.
Returns: Visitor - A single visitor object.
Example:

```
query {
  getSiteVisitorsByIp(ipAddress: "192.168.1.1") {
    id
    siteId
    ipAddress
    city
    country
    zipcode
    continent
    firstVisit
  }
}
```

### getSiteVisitorsByURL
#### Parameters:
url (String!): The URL for which to retrieve visitor information.
#### Returns: A visitorResponse object.
#### Example Query:

`
query {
  getSiteVisitorsByURL(url: "https://example.com") {
    visitors {
      id
      siteId
      ipAddress
      city
      country
      zipcode
      continent
      firstVisit
    }
    count
  }
}
`

### getSiteVisitorsByURLAndDate
#### Parameters:
url (String!): The URL for which to retrieve visitor information.
startDate (String!): The start date for the range.
endDate (String!): The end date for the range.
#### Returns: A visitorResponse object.
#### Example Query:

query {
  getSiteVisitorsByURLAndDate(url: "https://example.com", startDate: "2024-01-01", endDate: "2024-01-31") {
    visitors {
      id
      siteId
      ipAddress
      city
      country
      zipcode
      continent
      firstVisit
    }
    count
    }
}


### Mutations

### `addNewVisitor`

- **Parameters**:
- `siteId` (Int!): The ID of the site for which to add a new visitor.
- **Returns**: An array of integers.
- **Example Mutation**:
```graphql
mutation {
  addNewVisitor(siteId: 123)
}
```

### addNewVisitorWithIp
#### Parameters:
siteId (Int!): The ID of the site for which to add a new visitor.
ipAddress (String!): The IP address of the new visitor.
#### Returns: An array of integers.
#### Example Mutation:

```
mutation {
  addNewVisitorWithIp(siteId: 123, ipAddress: "192.168.1.1")
}

```

### updateVisitorDetails
#### Parameters:
data (VisitorInput): Input data for updating visitor details.
Returns: A string message confirming the update.
#### Example Mutation:

```
mutation {
  updateVisitorDetails(data: { id: 1, siteId: 123, ipAddress: "192.168.1.1", city: "City", country: "Country", zipcode: "ZipCode", continent: "Continent", firstVisit: "2024-01-01" })
}

```

### deleteVisitorById
#### Parameters:
siteId (Int!): The ID of the site for which to delete a visitor.
Returns: An integer indicating the number of deleted visitors.
#### Example Mutation:

mutation {
  deleteVisitorById(siteId: 123)
}


### deleteVisitorByIp
#### Parameters:
ipAddress (String!): The IP address of the visitor to delete.
Returns: An integer indicating the number of deleted visitors.
#### Example Mutation:

```
mutation {
  deleteVisitorByIp(ipAddress: "192.168.1.1")
}

```
### Types

Visitor
Fields:
id: (Int) The unique identifier of the visitor.
siteId: (Int) The ID of the site visited.
ipAddress: (String) The IP address of the visitor.
city: (String) The city from where the visitor accessed.
country: (String) The country from where the visitor accessed.
zipcode: (String) The zipcode of the visitor's location.
continent: (String) The continent from where the visitor accessed.
firstVisit: (String) The timestamp of the visitor's first visit.
VisitorInput
Fields:
Same as Visitor, but used as an input type for mutations.
visitorResponse
Fields:
visitors: ([Visitor]) An array of Visitor objects.
count: (Int) The count of visitors returned.