import Knex from 'knex';


export function up(knex: Knex): Knex.SchemaBuilder {
    return knex.schema.createTable('accessibility-description', (t) => {
        t.string('heading').notNullable();
        t.string('description').notNullable();
        t.string('recommended_action').notNullable();
        t.string('affected_disability');
        t.string('code');
    });
}


export function down(knex: Knex): Knex.SchemaBuilder {
    return knex.schema.dropTable('accessibility-description');
}

