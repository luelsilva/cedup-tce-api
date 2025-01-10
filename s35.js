const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware to enable CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

// Entry point to handle POST requests
app.post('/save-json', (req, res) => {
  const jsonObject = req.body;

  if (!jsonObject.idUnico) {
    return res
      .status(400)
      .json({ error: "The JSON object must contain an 'idUnico' key." });
  }

  const basePath = './tce';
  const folderPath = path.join(basePath, jsonObject.idUnico);

  // Ensure the base and target folders exist
  fs.mkdirSync(folderPath, { recursive: true });

  // Read the folder to determine the last version
  const files = fs.readdirSync(folderPath);
  const versions = files
    .map((file) => parseInt(file.split('.')[0], 10))
    .filter((num) => !isNaN(num));

  const lastVersion = Math.max(...versions, 0);
  const lastFilePath = path.join(
    folderPath,
    `${String(lastVersion).padStart(3, '0')}.json`
  );

  // Check if the new JSON is different from the last saved version
  if (fs.existsSync(lastFilePath)) {
    const lastFileContent = fs.readFileSync(lastFilePath, 'utf-8');
    const lastJsonObject = JSON.parse(lastFileContent);

    if (JSON.stringify(lastJsonObject) === JSON.stringify(jsonObject)) {
      return res
        .status(200)
        .json({
          message: 'No changes detected. File not saved.',
          lastVersion: lastVersion,
        });
    }
  }

  // Determine the next version number
  const nextVersion = String(lastVersion + 1).padStart(3, '0');
  const filePath = path.join(folderPath, `${nextVersion}.json`);

  // Write the JSON object to the file
  fs.writeFileSync(filePath, JSON.stringify(jsonObject, null, 2));

  res
    .status(201)
    .json({
      message: 'File saved successfully.',
      path: filePath,
      lastVersion: lastVersion + 1,
    });
});

// Route to get the last saved version of a JSON file
app.get('/get-json/:idUnico', (req, res) => {
  const idUnico = req.params.idUnico;

  const basePath = './tce';
  const folderPath = path.join(basePath, idUnico);

  if (!fs.existsSync(folderPath)) {
    return res
      .status(404)
      .json({ error: 'Folder not found for the given idUnico.' });
  }

  const files = fs.readdirSync(folderPath);
  const versions = files
    .map((file) => parseInt(file.split('.')[0], 10))
    .filter((num) => !isNaN(num));

  if (versions.length === 0) {
    return res
      .status(404)
      .json({ error: 'No files found for the given idUnico.' });
  }

  const lastVersion = Math.max(...versions);
  const lastFilePath = path.join(
    folderPath,
    `${String(lastVersion).padStart(3, '0')}.json`
  );

  const lastFileContent = fs.readFileSync(lastFilePath, 'utf-8');
  const lastJsonObject = JSON.parse(lastFileContent);

  res
    .status(200)
    .json({
      message: 'Last version retrieved successfully.',
      lastVersion: lastVersion,
      data: lastJsonObject,
    });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
