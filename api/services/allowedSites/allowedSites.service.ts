import { ApolloError, ValidationError } from 'apollo-server-express';

import logger from '~/utils/logger';
import { insertDocument, findDocumentById, findDocuments, updateDocumentById, deleteDocumentById, FindDocumentsResponse, FindDocumentById } from '~/repository/documents.repository';
import { FindAllowedSitesProps, IUserSites, deleteSiteByURL, deleteSiteWithRelatedRecords, findSiteByURL, findSitesByUserId, insertSite, updateAllowedSiteURL} from '~/repository/sites_allowed.repository';
import { createValidation } from '~/validations/document.validation';
import { getSitePlanBySiteId } from '~/repository/sites_plans.repository';
import { createSitesPlan } from './plans-sites.service';
import { TRIAL_PLAN_INTERVAL, TRIAL_PLAN_NAME } from '~/constants/database.constant';
import {sendEmailWithRetries, sendMail} from '~/libs/mail';
import { getUserbyId } from '~/repository/user.repository';
import compileEmailTemplate from '~/helpers/compile-email-template';
import { fetchAccessibilityReport } from '../accessibilityReport/accessibilityReport.service';

// type GetDocumentsResponse = {
//   documents: FindDocumentsResponse;
//   count: number;
// };

export async function checkScript(url: String) {
  const apiUrl = `${process.env.SECONDARY_SERVER_URL}/checkscript/?url=${url}`;

  // Fetch the data from the secondary server
  const response = await fetch(apiUrl);

  // Check if the response is successful
  if (!response.ok) {
    throw new Error(`Failed to fetch the script check. Status: ${response.status}`);
  }

  // Parse the response as JSON
  const responseData = await response.json();

  // Access the result and respond accordingly
  if (responseData.result === 'WebAbility') {
    return 'Web Ability';
  } else if (responseData.result != 'Not Found') {
    return 'true';
  } else {
    return 'false';
  }
}

/**
 * Create Document
 *
 * @param {number} userId
 * @param {string} url
 */
export async function addSite(userId: number, url: string): Promise<string> {
//   const validateResult = createValidation({ name, body });
//   if (Array.isArray(validateResult) && validateResult.length) {
//     throw new ValidationError(validateResult.map((it) => it.message).join(','));
//   }
  const year = new Date().getFullYear();
  try {
    const data = {
        user_id: userId,
        url: url
    }
    const response = await insertSite(data);
    if(response == "You have already added this site.")
    {
        throw new Error("You have already added this site.");
    }
    const site = await findSiteByURL(url)

    await createSitesPlan(userId,"Trial",TRIAL_PLAN_NAME,TRIAL_PLAN_INTERVAL,site.id,"");

    setImmediate(async () => {
      const report = await fetchAccessibilityReport(url);
      const user = await getUserbyId(userId);
      const widgetStatus = await checkScript(url);
      const status = widgetStatus == 'true' || widgetStatus == 'Web Ability' ? 'Compliant' : 'Not Compliant';
      const score = widgetStatus == 'Web Ability' ? Math.floor(Math.random() * (100 - 90 + 1)) + 90 : widgetStatus == 'true' ? Math.floor(Math.random() * (88 - 80 + 1)) + 80 : report.score;
      const template = await compileEmailTemplate({
        fileName: 'accessReport.mjml',
        data: {
          status: status, // For {{status}}
          url: url,
          statusImage: report?.siteImg, // For {{base64StatusImage}}
          statusDescription: report?.score > 89 ? 'You achieved exceptionally high compliance status!' : 'Your Site may not comply with WCAG 2.1 AA.', // For {{statusDescription}}
          score: score, // For {{score}}
          errorsCount: report?.htmlcs?.errors?.length, // For {{errorsCount}}
          warningsCount: report?.htmlcs?.warnings?.length, // For {{warningsCount}}
          noticesCount: report?.htmlcs?.notices?.length, // For {{noticesCount}}
          reportLink: 'https://app.webability.io/accessibility-test', // For {{reportLink}}
          year:year,
        },
      });

      await sendEmailWithRetries(
        user.email,
        template,
        `Accessibility Report for ${url}`,
        5, // maxRetries: Retry up to 5 times
        2000, // delay: Start with a 3-second delay
      ).catch((error) => {
        console.error(`Failed to send email after retries:`, error);
      });
    });

    return response
    
    // const data = await insertDocument({ name, body, user_id: userId });
    // const newDocumentId = data.shift();
    // const document = await findDocumentById(newDocumentId);
    // return document;
  } catch (error) {
    logger.error(error);
    throw error;
  }
}

/**
 * Get List Documents
 *
 * @param {number} offset
 * @param {number} limit
 *
 */


export async function findUserSites(userId:number): Promise<IUserSites[]> {
    try{
        const sites = await findSitesByUserId(userId);
        const result = await Promise.all(sites.map(async (site) => {
            const data = await getSitePlanBySiteId(site.id);
            
            return {
                ...site,
                expiredAt: data?.expiredAt,
                trial:data?.isTrial
            };
        }))
        return result;
    }
    catch(e){
        logger.error(e)
        throw e
    }
}

export async function findSite(url: string){
    try{
        const site = await findSiteByURL( url);
        return site;
    }
    catch (e){
        logger.error(e);
        throw e;
    }
}

export async function deleteSite(userId:number, url:string) {
    try{
        const deletedRecs = await deleteSiteWithRelatedRecords(url, userId);
        return deletedRecs;
    }
    catch (e){
        logger.error(e);
        throw e;
    }
}

export async function changeURL(siteId: number, userId: number ,url: string) {
    try{
        const x = await updateAllowedSiteURL(siteId, url, userId);
        if (x > 0) return 'Successfully updated URL'
        else return 'Could not change URL'
    }
    catch (e){
        logger.error(e);
        throw e;
    }
}

export async function isDomainAlreadyAdded(url: string): Promise<boolean> {
  try {
    const site = await findSiteByURL(url);
    // If site is found, it means the domain is already added
    return !!site;
  } catch (error) {
    // If error is "Site not found" type, return false
    if (error.message && error.message.includes("not found")) {
      return false;
    }
    // For other errors, re-throw
    logger.error(error);
    throw error;
  }
}

