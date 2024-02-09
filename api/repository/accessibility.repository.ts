import database from '~/config/database.config';
import { TABLES } from '~/constants/database.constant';

const TABLE = TABLES.accessibilityIssues;


export async function getAccessibilityDescription(headings:string[]) {
    return database(TABLE)
    .whereIn('heading', headings)
}