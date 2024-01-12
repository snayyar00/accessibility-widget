import { gql } from 'apollo-server-express';

export const AccessibilitySchema = gql`

        extend type Query {
            getAccessibilityReport(url: String!, reportType: Int!): AccessibilityReport
        }

        type AccessibilityReport {
            status: Status
            statistics: Statistics
            categories: [Category]
        }

        type Status {
            success: Boolean
            httpstatuscode: Int
        }

        type Statistics {
            pagetitle: String
            pageurl: String
            time: Float
            creditsremaining: Int
            allitemcount: Int
            totalelements: Int
            waveurl: String
        }

        type Category {
            description: String
            count: Int
            items: [CategoryItem]
        }

        type CategoryItem {
            id: String
            description: String
            count: Int
            xpaths: [String]
            contrastdata: [[String]]
            selectors: [String]
        }
		`;
