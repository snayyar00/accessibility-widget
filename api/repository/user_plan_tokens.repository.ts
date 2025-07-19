import database from '../config/database.config';
import { TABLES } from '../constants/database.constant';

const TABLE = TABLES.userPlanTokens;


export const userPlanTokensColumns = {
  id: `${TABLE}.id`,
  email: `${TABLE}.email`,
  user_id: `${TABLE}.user_id`,
  created_at: `${TABLE}.created_at`,
  token: `${TABLE}.token`,
};

export type userPlanTokensProps = {
  id: number,
  email: string,
  token: {},
  user_id: number
};

export async function addUserToken(
  user_id: number,
  newTokens: string[],
  email: string,
): Promise<any> {
  // 1) fetch existing
  const [row] = await database(TABLE)
    .select('token')
    .where({ user_id });

  // 2) parse existing into array (and drop any empty strings)
  const existing: string[] = row ?
    row.token.filter((t:any) => t.trim() !== '') :
    [];

  // 3) drop empty from newTokens too
  const cleanedNew = newTokens.filter(t => t.trim() !== '');

  // 4) merge, dedupe
  const merged = Array.from(new Set([...existing, ...cleanedNew]));

  if (row) {
    // Update existing row
    return database(TABLE)
      .where({ user_id })
      .update({ token: JSON.stringify(merged) });
  } 
  // Insert new row
  return database(TABLE).insert({
    user_id,
    token: JSON.stringify(merged),
    email,
  });
  
}
 


export async function findUsersByToken(searchToken: string): Promise<number[]> {
  // MySQL JSON_CONTAINS checks if the top-level JSON array contains the given value
  const rows = await database(TABLE)
    .select('user_id')
    .whereRaw(
      'JSON_CONTAINS(??, ?, \'$\')',
      [ `${TABLE}.token`, JSON.stringify(searchToken) ],
    );
  
  return rows.map(r => r.user_id);
}

export async function getUserTokens(user_id: number): Promise<any[]> {
  // Fetch the token JSON for the given user_id
  const row = await database(TABLE)
    .select('token')
    .where({ user_id })
    .first();
  
  if (!row || !row.token) {
    // No row or no token field → return empty array
    return [];
  }
  
  try {
    return row.token;
  } catch {
    // If parsing fails, return empty

    return [];
  }
}