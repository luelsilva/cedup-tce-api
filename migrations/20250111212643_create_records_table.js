exports.up = function (knex) {
  return knex.schema.createTable('tces', function (table) {
    table.string('idUnico').primary();
    table.string('matriculaEstagiario');
    table.string('nomeEstagiario');
    table.string('nomeEmpresa');
    table.integer('ultimaVersao');
    table.timestamp('dataCriacao').defaultTo(knex.fn.now());
    table.timestamp('dataAlteracao').defaultTo(knex.fn.now());

    // Adiciona índices
    table.index('nomeEstagiario'); // Índice para nomeEstagiario
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('tces');
};
