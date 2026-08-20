class DeploymentError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'DeploymentError'
    this.details = details
  }
}

module.exports = {
  DeploymentError,
}
