import { gql } from "apollo-server-express";

export const uniqueTokenSchema = gql`
    extend type Query{
        getVisitorTokenByWebsite(url: String!): String!
        validateToken(token: String!): String!
    }

`