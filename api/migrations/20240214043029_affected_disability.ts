import * as Knex from "knex";


export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable('affected_disability', (table) => {
        table.increments('id').primary();
        table.string('disability').notNullable();
        table.integer('description_id').unsigned().notNullable();
        table.foreign('description_id').references('id').inTable('accessibility_description');
    });
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema
        .dropTableIfExists('affected_disability')
        .dropTableIfExists('accessibility_description');
}

