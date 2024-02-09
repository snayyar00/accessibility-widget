import { getAccessibilityDescription } from "~/repository/accessibility.repository";

export async function readAccessibilityDescriptionFromDb(issues: any) {
    try {
        const errorHeadings = issues.errors.map((issue: any) => issue.heading);
        const warningHeadings = issues.warnings.map((issue: any) => issue.heading);
        const noticesHeadings = issues.notices.map((issue: any) => issue.heading);
        const headings = [...errorHeadings, ...warningHeadings, ...noticesHeadings];

        const matchedRecords = await getAccessibilityDescription(headings);
        // Find messages not present in the matched headings
        const notFoundErrors = issues.errors.filter((issue: any) => {
            !matchedHeadings.includes(issue.heading);
        });
        const notFoundWarnings = issues.warnings.filter((issue: any) => {
            !matchedHeadings.includes(issue.heading);
        });
        const notFoundNotices = issues.notices.filter((issue: any) => {
            !matchedHeadings.includes(issue.heading);
        });

        const matchedHeadings = matchedRecords.map(record => record.heading);
        const notFoundIssues = {
            errors: notFoundErrors,
            notices: notFoundNotices,
            warnings: notFoundWarnings
        }
        return [matchedHeadings, notFoundIssues];
    } catch (error) {
        console.log(error, '\nError retrieving accessibility issue description from database.');
    }
}