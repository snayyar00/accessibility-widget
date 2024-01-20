
import Visitor from "~/mongoSchema/visitor.model";
import logger from "~/utils/logger";
import crypto from 'crypto';

function generateUniqueToken() {
  return crypto.randomBytes(16).toString('hex');
}

export async function AddTokenToDB(businessName: string, email: string, website: string){
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
    logger.error('Error inserting data:', error)
    return '';
  }
}

export const GetVisitorTokenByWebsite = async (websiteName: string) => {
  try {
    const visitor = await Visitor.findOne({ Website: websiteName });
    return (visitor !== null ? visitor.Uniquetoken : 'none');
  } catch (error) {
    console.error('Error fetching visitor by website:', error);
    logger.error( error);
    return 'error';
  }
};

export const GetURLByUniqueToken = async (uniqueToken: string) => {
  try {
    const visitor = await Visitor.findOne({ Uniquetoken: uniqueToken });
    return (visitor !== null ? visitor.Website : null);
  }
  catch (error) {
    console.error('Error fetching visitor by website:', error);
    logger.error('Error fetching visitor by website:', error);
    return 'error';
  }
}

