import { gql } from "apollo-server-express";



export const uniqueTokenSchema = gql`
    type TokenValidationResponse {
        validation: String!
        savedState: JSON
    }

    extend type Query{
        getVisitorTokenByWebsite(url: String!): String!
        validateToken(url: String!): TokenValidationResponse!
    }

`