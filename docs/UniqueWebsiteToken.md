## getVisitorTokenByWebsite

Retrieves the unique token associated with a specific website. The tokens are stored in mongodb and retreived from there.

### Query

```graphql
query getVisitorTokenByWebsite($url: String!) {
  getVisitorTokenByWebsite(url: $url)
}
```

### Arguments

- `url` (String!): The URL of the website for which the unique token is requested. This argument is required.

### Returns

- `String!`: The unique token associated with the given website URL. Returns 'none' if no token is found for the specified website, and 'error' in case of any server-side errors.

### Example Query

```graphql
{
  getVisitorTokenByWebsite(url: "https://example.com")
}
```

### Example Response

```json
{
  "data": {
    "getVisitorTokenByWebsite": "abcd1234efgh5678"
  }
}
```

### Description

This query allows the client to retrieve the unique token assigned to a specific website. The `url` parameter should be the exact URL of the website as registered in the system. If a visitor record exists for the provided URL, the query returns the associated unique token. If no visitor is found, the query returns 'none'.

---

## validateToken

Validates if a given token is associated with an active site. This checks the records in both mongodb and the mysql database.

### Query

```graphql
query validateToken($token: String!) {
  validateToken(token: $token)
}
```

### Arguments

- `token` (String!): The unique token to be validated. This argument is required.

### Returns

- `String!`: Returns 'found' if the token is associated with an active site, 'notFound' if the token is not associated with any active site, and 'error' in case of any server-side errors.

### Example Query

```graphql
{
  validateToken(token: "abcd1234efgh5678")
}
```

### Example Response

```json
{
  "data": {
    "validateToken": "found"
  }
}
```

### Description

This query checks whether the provided unique token corresponds to an active site. It is useful for verifying the validity of tokens in the system. If the token is valid and associated with an active site, the query returns 'found'. If the token does not correspond to any active site or is invalid, it returns 'notFound'.
