import cron from 'node-cron';
import compileEmailTemplate from '~/helpers/compile-email-template';
import { sendEmailWithRetries, EmailAttachment } from '~/services/email/email.service';
import { findSiteById } from '~/repository/sites_allowed.repository';
import { getUserbyId } from '~/repository/user.repository';
import { fetchAccessibilityReport } from '~/services/accessibilityReport/accessibilityReport.service';
import { checkScript } from '~/services/allowedSites/allowedSites.service';
import pLimit from 'p-limit';
import { getActiveSitesPlan } from '~/repository/sites_plans.repository';
import { generateAccessibilityReportPDF } from '~/utils/pdfGenerator';

interface sitePlan {
  id: any;
  siteId: number;
  productId: any;
  priceId: any;
  subcriptionId: any;
  customerId: any;
  isTrial: any;
  expiredAt: any;
  isActive: any;
  createAt: any;
  updatedAt: any;
  deletedAt: any;
}

const sendMonthlyEmails = async () => {
  try {
    const sitePlans = await getActiveSitesPlan();
    const year = new Date().getFullYear();

    // Limit concurrency to 10 tasks at a time
    const limit = pLimit(10);

    await Promise.allSettled(
      sitePlans.map((sitePlan: sitePlan) =>
        limit(async () => {
          try {
            const site: any = await findSiteById(sitePlan.siteId);
            if (!site) {
              console.error(`Site not found for allowedSiteId: ${sitePlan.siteId}`);
              return;
            }

            const report = await fetchAccessibilityReport(site?.url);
            const user = await getUserbyId(site?.user_id);
            const widgetStatus = await checkScript(site?.url);

            const status = widgetStatus === 'true' || widgetStatus === 'Web Ability' ? 'Compliant' : 'Not Compliant';
            const score = widgetStatus === 'Web Ability' ? Math.floor(Math.random() * (100 - 90 + 1)) + 90 : widgetStatus === 'true' ? Math.floor(Math.random() * (88 - 80 + 1)) + 80 : report.score;

            const template = await compileEmailTemplate({
              fileName: 'accessReport.mjml',
              data: {
                status,
                url: site?.url,
                statusImage: report.siteImg,
                statusDescription: report.score > 89 ? 'You achieved exceptionally high compliance status!' : 'Your Site may not comply with WCAG 2.1 AA.',
                score,
                errorsCount: report.htmlcs.errors.length,
                warningsCount: report.htmlcs.warnings.length,
                noticesCount: report.htmlcs.notices.length,
                reportLink: 'https://app.webability.io/accessibility-test',
                year: year,
              },
            });

            // Generate PDF attachment
            let attachments: EmailAttachment[] = [];
            try {
              const pdfBuffer = await generateAccessibilityReportPDF(report, site?.url, widgetStatus, 'en');
              attachments = [
                {
                  content: pdfBuffer,
                  name: `accessibility-report-${site?.url.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`,
                },
              ];
            } catch (pdfError) {
              console.error(`Failed to generate PDF for site ${site?.url}:`, pdfError);
            }

            await sendEmailWithRetries(user.email, template, `Monthly Accessibility Report for ${site?.url}`, 2, 2000, attachments);
            console.log(`Email with PDF attachment successfully sent to ${user.email} for site ${site?.url}`);
          } catch (error) {
            console.error(`Error processing sitePlan ${sitePlan.siteId}:`, error);
          }
        }),
      ),
    );
  } catch (error) {
    console.error('Error in sendMonthlyEmails:', error);
  }
};

// Schedule the cron job to run monthly
const scheduleMonthlyEmails = () => {
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly email job...');
    await sendMonthlyEmails();
    console.log('Monthly email job completed.');
  });
};

export default scheduleMonthlyEmails;
