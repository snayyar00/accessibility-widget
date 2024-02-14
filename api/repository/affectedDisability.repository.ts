import database from '../config/database.config';
import { TABLES } from '../constants/database.constant';

const TABLE = TABLES.affectedDisability;

export async function addDisabilityToDb(disability: string, descriptionId: number) {
    return database(TABLE)
        .insert({
            disability,
            description_id: descriptionId
        });
}