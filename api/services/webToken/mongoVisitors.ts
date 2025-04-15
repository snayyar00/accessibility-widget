
import logger from '~/utils/logger';
import crypto from 'crypto';
import { findSite } from '../allowedSites/allowedSites.service';
import { findSiteByURL } from '~/repository/sites_allowed.repository';
import { getSitePlanBySiteId } from '~/repository/sites_plans.repository';
import { getWidgetSettingsBySiteId } from '~/repository/widget_settings.repository';

export async function ValidateToken(url: string) {

  let widgetSettings;
  try {
    const domain = url.replace(/^(https?:\/\/)?(www\.)?/, '');
    const site = await findSiteByURL(domain);
    widgetSettings = await getWidgetSettingsBySiteId(site.id);
    widgetSettings = widgetSettings?.settings || {};
    
  } catch (error) {
    console.error(error);
    widgetSettings = {};
  }
  

  try {
    if (url === 'webability.io' || url === 'localhost'){
      // return 'found';
      return {
        'validation': 'found',
        'savedState': widgetSettings
      };
    }
    const site =  await findSiteByURL(url);

    const activePlan = await getSitePlanBySiteId(site?.id);

    if (!activePlan) {
      // return 'notFound';
      return {
        'validation': 'notFound',
        'savedState': null
      };
    }
    // console.log(activePlan);
    const currentTime = new Date().getTime();
    const timeDifference = new Date(activePlan?.expiredAt).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    // console.log(timeDifference,"seven = ",sevendays);
    if (timeDifference > sevendays) {
      // return 'found';
      return {
        'validation': 'found',
        'savedState': widgetSettings
      };
    }
    if (timeDifference < sevendays && timeDifference > 0) {
      // return 'found';
      return {
        'validation': 'found',
        'savedState': widgetSettings
      };
    }
    // return 'notFound';
    return {
      'validation': 'notFound',
      'savedState': null
    };

  } catch (error) {
    console.error('Error in ValidateToken:', error);
    logger.error('There was an error validating the provided unique token.', error);
    // return 'error';
    return {
      'validation': 'error',
      'savedState': null
    };
  }
}

