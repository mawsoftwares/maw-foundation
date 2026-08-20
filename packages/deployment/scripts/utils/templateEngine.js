function resolvePath(data, key) {
  return key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), data)
}

function renderTemplate(templateContent, data) {
  return templateContent.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const value = resolvePath(data, key)
    return value == null ? '' : String(value)
  })
}

module.exports = {
  renderTemplate,
}
