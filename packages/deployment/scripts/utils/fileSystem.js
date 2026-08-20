const fs = require('fs')
const path = require('path')

function ensureDirSync(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true })
}

function readJsonFileSync(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(content)
}

function writeFileSync(filePath, content) {
  ensureDirSync(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf8')
}

function copyFileSync(sourcePath, targetPath) {
  ensureDirSync(path.dirname(targetPath))
  fs.copyFileSync(sourcePath, targetPath)
}

module.exports = {
  copyFileSync,
  ensureDirSync,
  readJsonFileSync,
  writeFileSync,
}
