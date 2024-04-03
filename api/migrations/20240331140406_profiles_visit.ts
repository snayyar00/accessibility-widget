import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.table('impressions', function(table) {
    table.json('profileCounts');
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.table('impressions', function(table) {
    table.dropColumn('profileCounts');
  });
}

