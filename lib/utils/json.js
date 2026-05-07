const fs = require('fs');

function stripBom(text) {
  return String(text).replace(/^\uFEFF/, '');
}

function readJsonFile(filePath) {
  return JSON.parse(stripBom(fs.readFileSync(filePath, 'utf8')));
}

module.exports = {
  readJsonFile,
  stripBom
};
