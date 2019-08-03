const handleError = (reject) => (error, response, body) => {
  const replacer = (key, value) => {
    if (!key) return value
    if (typeof value === 'object') return 'object'
    if (typeof value === 'function') return 'function'
    return value ? value.toString() : value;
  }
  console.error(`Failure!`)
  // console.error(`response: ${JSON.stringify(response, replacer, 2)}`)
  console.error(`body: ${body}`)
  reject(error)
}

module.exports = { handleError }
