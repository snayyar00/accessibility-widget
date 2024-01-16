## GraphQL API Documentation

### Types

#### Site
Represents a site with various properties.
- `id`: Int
- `user_id`: Int
- `url`: String
- `updatedAt`: String
- `createAt`: String

#### siteUpdateResponse
Response type for site update operations.
- `success`: Boolean! (Non-nullable)
- `message`: String! (Non-nullable)

#### AllowedSitesList
A list of allowed sites.
- `sites`: Array of `Site`
- `count`: Int

### Queries

#### getUserSites
Returns a list of sites associated with a user.
- Returns: Array of `Site`

Example:
```graphql
query {
  getUserSites {
    id
    user_id
    url
    updatedAt
    createAt
  }
}
```

#### getSiteByURL
Fetches a site based on its URL.

Parameters:
url: String! (Non-nullable)
Returns: Site
Example:

```graphql
query {
  getSiteByURL(url: "https://example.com") {
    id
    user_id
    url
    updatedAt
    createAt
  }
}

```

### Mutations

#### addSite
Adds a new site.

Parameters:
url: String! (Non-nullable)
Returns: String! (Non-nullable) - A confirmation message.
Example:
```gql
mutation {
  addSite(url: "https://newsite.com")
}

```

#### deleteSite
Deletes a site based on its URL.

Parameters:
url: String! (Non-nullable)
Returns: Int! (Non-nullable) - The number of deleted records.
Example:
```gql
mutation {
  deleteSite(url: "https://oldsite.com")
}

```

### changeURL
Changes the URL of an existing site.

Parameters:
newURL: String! (Non-nullable)
siteId: Int! (Non-nullable)
Returns: String - A confirmation message.
Example:
```gql
mutation {
  changeURL(newURL: "https://updatedsite.com", siteId: 123)
}

```