import { addProblemReport, problemReportProps } from "~/repository/problem_reports.repository";
import { FindAllowedSitesProps, findSiteByURL } from "~/repository/sites_allowed.repository";

export async function handleReportProblem(site_url: string, issue_type: string, description: string, reporter_email: string): Promise<string> {
    try {
        const domain = site_url.replace(/^(https?:\/\/)?(www\.)?/, '');
        const site:FindAllowedSitesProps = await findSiteByURL(domain);

        if (!site) {
            return "Site not found";
        }

        const problem:problemReportProps = {site_id:site.id, issue_type:(issue_type as "bug" | "accessibility"), description:description, reporter_email:reporter_email};
    

        await addProblemReport(problem);

        return "Problem reported successfully";
    } catch (error) {
        console.error("Error reporting problem:", error);
        return "Cannot report problem";
    }
}