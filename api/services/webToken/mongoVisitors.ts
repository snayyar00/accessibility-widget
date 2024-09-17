import Visitor from '~/mongoSchema/visitor.model';
import logger from '~/utils/logger';
import crypto from 'crypto';
import { findSite } from '../allowedSites/allowedSites.service';
import { findSiteByURL } from '~/repository/sites_allowed.repository';
import { getSitePlanBySiteId } from '~/repository/sites_plans.repository';

function generateUniqueToken() {
  return crypto.randomBytes(16).toString('hex');
}

export async function RemoveTokenFromDB(website: string) {
  try {
    const result = await Visitor.findOneAndDelete({ Website: website });
    if (result) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error removing token:', error);
    logger.error('Error removing token:', error);
    return false;
  }
}

export async function UpdateWebsiteURL(oldURL: string, newURL: string) {
  try {
    const result = await Visitor.findOneAndUpdate(
      { Website: oldURL },
      { $set: { Website: newURL } },
      { new: true },
    );

    if (result) {
      return true; // Successfully updated
    } else {
      return false; // No document found to update
    }
  } catch (error) {
    console.error('Error updating website URL:', error);
    logger.error('Error updating website URL:', error);
    return false;
  }
}

export async function AddTokenToDB(businessName: string, email: string, website: string) {
  const uniqueToken = generateUniqueToken();
  const visitorDocument = new Visitor({
    BusinessName: businessName,
    Email: email,
    Website: website,
    Uniquetoken: uniqueToken,
  });

  try {
    await visitorDocument.save();
    return uniqueToken;
  } catch (error) {
    console.error('Error inserting data:', error);
    logger.error('Error inserting data:', error);
    return '';
  }
}

export const GetVisitorTokenByWebsite = async (websiteName: string) => {
  try {
    const visitor = await Visitor.findOne({ Website: websiteName });
    return (visitor !== null ? visitor.Uniquetoken : 'none');
  } catch (error) {
    console.error('Error fetching visitor by website:', error);
    logger.error(error);
    return 'error';
  }
};

export const GetURLByUniqueToken = async (uniqueToken: string) => {
  try {
    const visitor = await Visitor.findOne({ Uniquetoken: uniqueToken });
    return (visitor !== null ? visitor.Website : null);
  } catch (error) {
    console.error('Error fetching visitor by website:', error);
    logger.error('Error fetching visitor by website:', error);
    return 'error';
  }
};

export async function ValidateToken(url: string) {
  console.log('ValidateToken function called with url:', url);
  
  const site = await findSiteByURL(url);
  console.log('Site found:', site);
    
  if (!site) {
    console.log('Site not found for URL:', url);
    return 'notFoundSite';
  }
    
  const active = await getSitePlanBySiteId(site.id);
  console.log('Active plan:', active);
    
  if (active?.is_active) {
    console.log('Active plan found for site');
    return 'found';
  } else {
    console.log('No active plan found for site');
    return 'notFoundActive';
  }
  // } catch (e) {
  //   console.error('Error in ValidateToken:', e);
  //   logger.error('There was an error validating the provided unique token. ', e);
  //   return 'error';
  // }
}

