import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('sites_plans', (t) => {
    t.increments('id');
    t.integer('allowed_site_id').unsigned().notNullable();
    t.integer('product_id').unsigned().notNullable();
    t.integer('price_id').unsigned().notNullable();
    t.string('subcription_id').notNullable();
    t.string('customer_id').notNullable();
    t.boolean('is_trial').defaultTo(false);
    t.dateTime('expired_at');
    t.boolean('is_active').defaultTo(true);
    t.dateTime('created_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    t.dateTime('updated_at')
      .notNullable()
      .defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
    t.dateTime('deleted_at');
    t.foreign('allowed_site_id').references('id').inTable('allowed_sites');
    t.foreign('product_id').references('id').inTable('products');
    t.foreign('price_id').references('id').inTable('prices');
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('sites_plans');
}

