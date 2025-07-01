import { ApolloError, ValidationError } from 'apollo-server-express';

import logger from '~/utils/logger';
import { getCityAndCountry } from '~/helpers/uniqueVisitor.helper';
import {  VisitorInfo, deleteVisitorId, deleteVisitorIp, findVisitorByIp, findVisitorBySiteId, findVisitorByURL, findVisitorByURLDate, insertVisitor, updateVisitorByIp } from '~/repository/visitors.repository';
import { UserProfile } from '~/repository/user.repository';
import { findUserSites } from '~/services/allowedSites/allowedSites.service';


/**
 * Create Document
 *
 * @param {number} userId
 * @param {string} url
 */
export async function addNewVisitor(ipAddress: string, siteId: number): Promise<number[]> {
//   const validateResult = createValidation({ name, body });
//   if (Array.isArray(validateResult) && validateResult.length) {
//     throw new ValidationError(validateResult.map((it) => it.message).join(','));
//   }

  try {
    let data:any = await getCityAndCountry(ipAddress);
    data.ip_address = ipAddress;
    data.site_id = siteId;
    const response = await insertVisitor(data);
    return response
    
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

export async function getSiteVisitors(siteId:number, user: UserProfile){
    try{
        const userSites = await findUserSites(user.id);
        const userSiteIds = userSites.map(site => site.id);

        if (!userSiteIds.includes(siteId)) {
            throw new ApolloError('User does not own this site', 'FORBIDDEN');
        }
        
        const visitors = await findVisitorBySiteId(siteId);

        return { visitors: visitors, count: visitors.length }
    }
    catch(e){
        logger.error(e)
        throw e
    }
}

export async function getSiteVisitorsByURL(url: string, user: UserProfile){
    try {
        const userSites = await findUserSites(user.id);
        const userSiteIds = userSites.map(site => site.id);

        const visitors = await findVisitorByURL(url);
        const filteredVisitors = visitors.filter(v => userSiteIds.includes(v.siteId));

        return { visitors: filteredVisitors, count: filteredVisitors.length }
    }
    catch(e){
        logger.error(e);
        throw e;
    }
}

export async function getSiteVisitorsByURLAndDate(url: string, startDate: Date, endDate: Date, user: UserProfile){
    try{
        const userSites = await findUserSites(user.id);
        const userSiteIds = userSites.map(site => site.id);

        const visitors = await findVisitorByURLDate(url, startDate, endDate);
        const filteredVisitors = visitors.filter(v => userSiteIds.includes(v.siteId));

        return { visitors: filteredVisitors, count: filteredVisitors.length }
    }
    catch(e){
        logger.error(e);
        throw e;
    }
}


export async function getVisitorByIp(ipAddress: string, user: UserProfile) {
    try{
        const userSites = await findUserSites(user.id);
        const userSiteIds = userSites.map(site => site.id);

        const visitor = await findVisitorByIp(ipAddress);

        if (!visitor || !userSiteIds.includes(visitor.siteId)) {
            throw new ApolloError('User does not own this site', 'FORBIDDEN');
        }
        
        return visitor;
    }
    catch(e){
        logger.error(e)
        throw e
    }
}



export async function deleteVisitorByIp(ipAddress: string) {
    try{
        const deletedRecs = await deleteVisitorIp(ipAddress)
        return deletedRecs;
    }
    catch (e){
        logger.error(e);
        throw e;
    }
}
export async function deleteVisitorById(siteId: number) {
    try{
        const deletedRecs = await deleteVisitorId(siteId)
        return deletedRecs;
    }
    catch (e){
        logger.error(e);
        throw e;
    }
}

export async function updateVisitorDetails(ipAddress: string, data: VisitorInfo) {
    try{
        const x = await updateVisitorByIp(ipAddress, data);
        if (x > 0) return 'Successfully updated URL'
        else return 'Could not change URL'
    }
    catch (e){
        logger.error(e);
        throw e;
    }
}

