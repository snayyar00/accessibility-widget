import logger from '~/libs/logger/application-logger';
import { findSiteByURL } from '~/repository/sites_allowed.repository';
import { getSitePlanBySiteId } from '~/repository/sites_plans.repository';
import { getWidgetSettingsBySiteId } from '~/repository/widget_settings.repository';
import { validateTokenUrl } from '~/validations/widget.validation';
import { normalizeDomain } from '~/utils/domain.utils';
import { getRootDomain } from '~/utils/domainUtils';

export async function ValidateToken(url: string): Promise<{
  validation: string;
  savedState: any;
  error?: string;
}> {


  const extractRootDomain = getRootDomain(url);
  const validateResult = validateTokenUrl({ url: extractRootDomain });

  if (Array.isArray(validateResult) && validateResult.length) {
    console.error('Error in ValidateToken:', validateResult);
    logger.error('There was an error validating the provided unique token.', validateResult);

    return {
      validation: 'error',
      savedState: null,
    };
  }

  const domain = normalizeDomain(url);

  let widgetSettings;

  try {
    const site = await findSiteByURL(domain);

    widgetSettings = await getWidgetSettingsBySiteId(site.id);
    widgetSettings = widgetSettings?.settings || {};

  } catch (error) {
    console.error(error);
    widgetSettings = {};
  }

  try {
    if (domain === 'webability.io' || domain === 'localhost') {
      return {
        validation: 'found',
        savedState: widgetSettings,
      };
    }

    const site = await findSiteByURL(domain);
    const activePlan = site ? await getSitePlanBySiteId(site.id) : null;

    if (!activePlan) {
      return {
        validation: 'notFound',
        savedState: null,
      };
    }

    const currentTime = new Date().getTime();
    const timeDifference = new Date(activePlan?.expiredAt).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    if (timeDifference > sevendays) {
      return {
        validation: 'found',
        savedState: widgetSettings,
      };
    }

    if (timeDifference < sevendays && timeDifference > 0) {
      return {
        validation: 'found',
        savedState: widgetSettings,
      };
    }
    
    return {
      validation: 'notFound',
      savedState: null,
    };
  } catch (error) {
    console.error('Error in ValidateToken:', error);
    logger.error('There was an error validating the provided unique token.', error);
    
    return {
      validation: 'error',
      savedState: null,
    };
  }
}
