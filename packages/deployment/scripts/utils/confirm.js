const readline = require('readline')

/**
 * Prompt the operator before mutating shared server state (nginx, etc.).
 * Defaults to "no" when stdin is not a TTY (CI/non-interactive).
 */
function confirmPrompt(question) {
  if (!process.stdin.isTTY) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(`${question} [y/N]: `, (answer) => {
      rl.close()
      resolve(/^y(es)?$/i.test(answer.trim()))
    })
  })
}

module.exports = {
  confirmPrompt,
}
