import Knex from 'knex';


export function up(knex: Knex): Knex.SchemaBuilder {
    return knex.schema.createTable('accessibility_description', (t) => {
        t.increments('id').primary();
        t.string('heading', 1000).notNullable();
        t.string('description', 1000).notNullable();
        t.string('recommended_action', 1000).notNullable();
        t.string('code');
    });
}


export function down(knex: Knex): Knex.SchemaBuilder {
    return knex.schema.dropTable('accessibility_description');
}
