import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('sites_permissions', (t) => {
    t.increments('id');
    t.integer('allowed_site_id').unsigned().notNullable();
    t.string('permission');
    t.integer('sites_plan_id').unsigned();
    t.dateTime('created_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.dateTime('deleted_at');
    t.foreign('allowed_site_id').references('id').inTable('allowed_sites');
    t.foreign('sites_plan_id').references('id').inTable('sites_plans');
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('sites_permissions');
}

