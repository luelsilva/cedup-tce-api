// Importa os módulos necessários
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const knex = require('knex');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do banco de dados SQLite com o Knex
const db = knex({
    client: 'sqlite3',
    connection: {
        filename: process.env.DB_FILE || './database.sqlite'
    },
    useNullAsDefault: true,
    debug: true
});

// Middleware para processar JSON no body das requisições
app.use(express.json());

// Middleware para habilitar CORS
app.use(cors());

// Endpoint para receber e salvar o JSON
app.post('/save-json', async (req, res) => {
    const jsonObject = req.body;

    // Verifica se o objeto contém a chave 'idUnico'
    if (!jsonObject.idUnico) {
        return res.status(400).send({ error: 'A chave idUnico é obrigatória no JSON.' });
    }

    const folderName = `./tce/${jsonObject.idUnico}`;

    // Cria a pasta se não existir
    if (!fs.existsSync(folderName)) {
        fs.mkdirSync(folderName, { recursive: true });
    }

    // Lê os arquivos existentes na pasta
    const files = fs.readdirSync(folderName);

    // Filtra apenas arquivos JSON e determina a última versão
    const versions = files
        .filter(file => file.endsWith('.json'))
        .map(file => parseInt(file.replace('.json', ''), 10))
        .sort((a, b) => b - a); // Ordena em ordem decrescente

    const lastVersion = versions.length > 0 ? versions[0].toString().padStart(3, '0') : null;
    const lastFilePath = lastVersion ? path.join(folderName, `${lastVersion}.json`) : null;

    // Verifica se o conteúdo da última versão é igual ao novo JSON
    if (lastFilePath && fs.existsSync(lastFilePath)) {
        const lastFileContent = fs.readFileSync(lastFilePath, 'utf-8');
        if (JSON.stringify(jsonObject) === lastFileContent) {
            return res.status(200).send({ message: 'Nenhuma alteração detectada. Arquivo não salvo.' });
        }
    }

    // Determina a próxima versão
    const nextVersion = (Math.max(0, ...versions) + 1).toString().padStart(3, '0');
    const filePath = path.join(folderName, `${nextVersion}.json`);

    // Salva o arquivo JSON na pasta
    fs.writeFileSync(filePath, JSON.stringify(jsonObject, null, 2));

    // Atualiza ou insere informações no banco de dados
    try {
        const existingRecord = await db('tces').where({ idUnico: jsonObject.idUnico }).first();

        if (existingRecord) {
            // Atualiza o registro existente
            await db('tces')
                .where({ idUnico: jsonObject.idUnico })
                .update({
                    ultimaVersao: nextVersion,
                    dataAlteracao: db.fn.now()
                });
        } else {
            // Insere um novo registro
            await db('tces').insert({
                idUnico: jsonObject.idUnico,
                nomeEstagiario: jsonObject.nomeEstagiario || null,
                nomeEmpresa: jsonObject.nomeEmpresa || null,
                ultimaVersao: nextVersion,
                dataCriacao: db.fn.now(),
                dataAlteracao: db.fn.now()
            });
        }
    } catch (error) {
        return res.status(500).send({ error: 'Erro ao atualizar a tabela tces.', details: error.message });
    }

    res.status(200).send({ message: 'Arquivo salvo com sucesso!', filePath });
});

// Endpoint para obter todos os registros da tabela tces ordenados por nomeEstagiario
app.get('/tces', async (req, res) => {
    try {
        const records = await db('tces').select('*').orderBy('nomeEstagiario', 'asc');
        res.status(200).send(records);
    } catch (error) {
        res.status(500).send({ error: 'Erro ao buscar os registros na tabela tces.', details: error.message });
    }
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
