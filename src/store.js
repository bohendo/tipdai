const { Pool } = require('pg')

const config = require('./config')

const pool = new Pool(config.postgres)

const init = `CREATE TABLE IF NOT EXISTS tipdai (key VARCHAR PRIMARY KEY, value VARCHAR NOT NULL);`

const firstConnection = new Promise((resolve, reject) => {
  pool.query(init, (err, res) => {
    if (err && err.code === 'ENOTFOUND') {
      console.log(`Database isn't awake yet, let's try again later..`)
      process.exit(1)
    }
    if (err) {
      console.log(`Error: ${err}`)
      process.exit(1)
    }
    console.log(`Successfully connected to data store!`)
    resolve(true)
  })
})

const get = async (key) => {
  await firstConnection
  return new Promise(async (resolve, reject) => {
    await pool.query(`SELECT value FROM tipdai WHERE key = $1`, [key], (err, res) => {
      if (err) {
        return reject(err)
      }
      if (res && res.rows && res.rows[0] && res.rows[0].value) {
        return resolve(res.rows[0].value)
      }
      return resolve(undefined)
    })
  })
}

const set = async (key, value) => {
  await firstConnection
  return new Promise(async (resolve, reject) => {
    if (await get(key)) {
      await pool.query(`UPDATE tipdai SET value = $1 WHERE key = $2`, [value, key], (err, res) => {
        return err ? reject(err) : resolve(true)
      })
    } else {
      await pool.query(`INSERT INTO tipdai VALUES ($1, $2)`, [key, value], (err, res) => {
        return err ? reject(err) : resolve(true)
      })
    }
  })
}

module.exports = { get, set, firstConnection }
