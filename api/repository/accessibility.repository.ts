import database from '../config/database.config';
import { TABLES } from '../constants/database.constant';
import { addDisabilityToDb } from './affectedDisability.repository';

const TABLE = TABLES.accessibilityDescription;

interface dbIssue{
  heading: string,
  description: string,
  recommended_action?: string,
  affectedDisabilities?: string[],
  code: string
}

export async function getAccessibilityDescription(headings:any) {
  return database(TABLE)
    .whereIn('heading', headings);
}

export async function addAccessibilityDescription(issue: dbIssue ){
  const { affectedDisabilities, ...issueDetails } = issue;
  const [insertedId] = await database(TABLE)
    .insert(issueDetails);
  affectedDisabilities.map(disability =>{
    addDisabilityToDb(disability, insertedId);
  });

}