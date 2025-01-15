# cedup-tce-api

# coamndos do Knex

## Executa todas as migrations pendentes na ordem correta

npx knex migrate:latest

## Criar uma migration

npx knex migrate:make nome_da_migration

## Reverter a última migration

npx knex migrate:rollback

## Reverter todas as migrations

npx knex migrate:rollback --all

## Checar o status das migrations

npx knex migrate:status
