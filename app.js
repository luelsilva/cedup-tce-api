// Importa os módulos necessários
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const knex = require('knex');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const VERSAO = {
  API: 'API-Cedup-TCE',
  Versão: '08/03/2025 07:57',
  Porta: PORT,
};

// Configuração do banco de dados SQLite com o Knex
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: process.env.DB_FILE || './database.sqlite',
  },
  useNullAsDefault: true,
  // debug: true,
});

// Middleware para processar JSON no body das requisições
app.use(express.json());

// Middleware para habilitar CORS
// app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.lco.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// funcao sha-256
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

// Endpoint para receber e salvar o JSON
app.post('/tce', async (req, res) => {
  const jsonObject = req.body;

  // Verifica se o objeto contém a chave 'idUnico'
  if (!jsonObject.idUnico) {
    return res
      .status(400)
      .send({ error: 'A chave idUnico é obrigatória no JSON.' });
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
    .filter((file) => file.endsWith('.json'))
    .map((file) => parseInt(file.replace('.json', ''), 10))
    .sort((a, b) => b - a); // Ordena em ordem decrescente

  const lastVersion =
    versions.length > 0 ? versions[0].toString().padStart(3, '0') : null;
  const lastFilePath = lastVersion
    ? path.join(folderName, `${lastVersion}.json`)
    : null;

  // Verifica se o conteúdo da última versão é igual ao novo JSON
  if (lastFilePath && fs.existsSync(lastFilePath)) {
    const lastFileContent = fs.readFileSync(lastFilePath, 'utf-8');

    data = JSON.parse(lastFileContent);

    sha1 = await sha256(JSON.stringify(jsonObject));
    sha2 = await sha256(JSON.stringify(data));

    if (sha1 === sha2) {
      return res
        .status(200)
        .send({ message: 'Nenhuma alteração detectada. Arquivo não salvo.' });
    }
  }

  // Determina a próxima versão
  const nextVersion = (Math.max(0, ...versions) + 1)
    .toString()
    .padStart(3, '0');
  const filePath = path.join(folderName, `${nextVersion}.json`);

  // Salva o arquivo JSON na pasta
  fs.writeFileSync(filePath, JSON.stringify(jsonObject, null, 2));

  // Atualiza ou insere informações no banco de dados
  try {
    const existingRecord = await db('tces')
      .where({ idUnico: jsonObject.idUnico })
      .first();

    if (existingRecord) {
      // Atualiza o registro existente
      await db('tces')
        .where({ idUnico: jsonObject.idUnico })
        .update({
          ultimaVersao: nextVersion,
          dataAlteracao: db.fn.now(),
          matriculaEstagiario: jsonObject.matriculaEstagiario || '',
          nomeEstagiario: jsonObject.nomeEstagiario || '',
          nomeEmpresa: jsonObject.nomeEmpresa || '',
        });
    } else {
      // Insere um novo registro
      await db('tces').insert({
        idUnico: jsonObject.idUnico,
        matriculaEstagiario: jsonObject.matriculaEstagiario || '',
        nomeEstagiario: jsonObject.nomeEstagiario || '',
        nomeEmpresa: jsonObject.nomeEmpresa || '',
        ultimaVersao: nextVersion,
        dataCriacao: db.fn.now(),
        dataAlteracao: db.fn.now(),
      });
    }
  } catch (error) {
    return res.status(500).send({
      error: 'Erro ao atualizar a tabela tces.',
      details: error.message,
    });
  }

  res.status(200).send({ message: 'Arquivo salvo com sucesso!' });
});

// Endpoint da versão
app.get('/', async (req, res) => {
  res.status(200).send(VERSAO);
});

// Endpoint para obter todos os registros da tabela tces ordenados por nomeEstagiario
app.get('/tces', async (req, res) => {
  try {
    const records = await db('tces')
      .select('*')
      .orderBy('nomeEstagiario', 'asc');
    res.status(200).send(records);
  } catch (error) {
    res.status(500).send({
      error: 'Erro ao buscar os registros na tabela tces.',
      details: error.message,
    });
  }
});

// Endpoint para obter a última versão de um JSON por idUnico
app.get('/tce/:idUnico', (req, res) => {
  const { idUnico } = req.params;
  const folderName = `./tce/${idUnico}`;

  // Verifica se a pasta existe
  if (!fs.existsSync(folderName)) {
    return res
      .status(404)
      .send({ error: 'Pasta não encontrada para o idUnico fornecido.' });
  }

  // Lê os arquivos existentes na pasta
  const files = fs.readdirSync(folderName);

  // Filtra apenas arquivos JSON e determina a última versão
  const versions = files
    .filter((file) => file.endsWith('.json'))
    .map((file) => parseInt(file.replace('.json', ''), 10))
    .sort((a, b) => b - a); // Ordena em ordem decrescente

  const lastVersion =
    versions.length > 0 ? versions[0].toString().padStart(3, '0') : null;
  const lastFilePath = lastVersion
    ? path.join(folderName, `${lastVersion}.json`)
    : null;

  // Verifica se há uma última versão
  if (!lastFilePath || !fs.existsSync(lastFilePath)) {
    return res
      .status(404)
      .send({ error: 'Nenhuma versão encontrada para o idUnico fornecido.' });
  }

  // Lê e retorna o conteúdo do arquivo
  const fileContent = fs.readFileSync(lastFilePath, 'utf-8');
  res.status(200).send(JSON.parse(fileContent));
});

// Endpoint para deletar um registro e sua pasta correspondente
app.delete('/tce/:idUnico', async (req, res) => {
  const { idUnico } = req.params;
  const { senha } = req.body;
  const folderPath = `./tce/${idUnico}`;

  if (senha !== '12345678') {
    return res.status(403).send({ message: 'Senha inválida.' });
  }

  try {
    await db('tces').where({ idUnico }).del();
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
    res
      .status(200)
      .send({ message: 'Registro e pasta deletados com sucesso!' });
  } catch (error) {
    res
      .status(500)
      .send({ message: 'Erro ao deletar o registro.', details: error.message });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(VERSAO);
});
