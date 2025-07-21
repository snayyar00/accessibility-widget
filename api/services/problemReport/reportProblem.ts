import { ValidationError } from "apollo-server-express";
import compileEmailTemplate from "~/helpers/compile-email-template";
import { sendMail } from "~/libs/mail";
import { addProblemReport, problemReportProps } from "~/repository/problem_reports.repository";
import { FindAllowedSitesProps, findSiteByURL } from "~/repository/sites_allowed.repository";
import { validateReportProblem } from "~/validations/reportProblem.validation";
import { getUserbyId } from "~/repository/user.repository";
import { getRootDomain } from "~/utils/domainUtils";

export async function handleReportProblem(site_url: string, issue_type: string, description: string, reporter_email: string): Promise<string> {
    const validateResult = validateReportProblem({ site_url, issue_type, description, reporter_email });

    if (Array.isArray(validateResult) && validateResult.length) {
        throw new ValidationError(validateResult.map((it) => it.message).join(','));
    }

    try {
        const year = new Date().getFullYear();
      //  const domain = site_url.replace(/^(https?:\/\/)?(www\.)?/, '');
      const domain = getRootDomain(site_url);
        const site:FindAllowedSitesProps = await findSiteByURL(domain);

        if (!site) {
            return "Site not found";
        }

        const problem:problemReportProps = {site_id:site.id, issue_type:(issue_type as "bug" | "accessibility"), description:description, reporter_email:reporter_email};
    
        await addProblemReport(problem);

        const template = await compileEmailTemplate({
            fileName: 'reportProblem.mjml',
            data: {
                issue_type: problem.issue_type,
                description: problem.description,
                year: year,
            },
        });
        const template1 = await compileEmailTemplate({
            fileName: 'problemReported.mjml',
            data: {
                issue_type: problem.issue_type,
                description: problem.description,
                year: year,
                domain: domain,
            },
        });
        sendMail(problem.reporter_email, 'Problem reported', template1)
        .then(() => console.log('Mail sent successfully'))
        .catch((mailError) => console.error('Error sending mail:', mailError));

        // Send email to the domain owner if possible
        if (site.user_id) {
          
            const owner = await getUserbyId(site.user_id);
            if (owner && owner.email) {
                sendMail(owner.email, 'A problem was reported for your site', template)
                .then(() => console.log('Owner mail sent successfully'))
                .catch((mailError) => console.error('Error sending owner mail:', mailError));
            }
        }

        return "Problem reported successfully";
    } catch (error) {
        console.error("Error reporting problem:", error);
        return "Cannot report problem";
    }
}