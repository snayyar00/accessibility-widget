import { gql } from "apollo-server-express";

export const reportProblemSchema = gql`
    extend type Mutation {
        reportProblem(site_url: String!, issue_type: String!, description: String!, reporter_email: String!): String!
    }
`;