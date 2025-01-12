exports.up = function(knex) {
    return knex.schema.createTable('records', function(table) {
        table.string('idUnico').primary();
        table.string('nomeEstagiario');
        table.string('nomeEmpresa');
        table.integer('ultimaVersao');
        table.timestamp('dataCriacao').defaultTo(knex.fn.now());
        table.timestamp('dataAlteracao').defaultTo(knex.fn.now());

        // Adiciona índices
        table.index('nomeEstagiario'); // Índice para nomeEstagiario
        table.index('nomeEmpresa');   // Índice para nomeEmpresa
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('records');
};
