const fs = require("fs");

const ConnextClientStorePrefix = 'TipDai'
const dbFile = '.store.json'

let storeObj;
try {
  fs.readFileSync(dbFile, "utf8")
} catch (e) {
  fs.writeFileSync(dbFile, JSON.stringify(storeObj, null, 2));
}

const store = {

  get: async (path) => {
    if (!storeObj) {
      storeObj = JSON.parse(fs.readFileSync(dbFile, "utf8") || "{}");
    }
    const raw = storeObj[`${ConnextClientStorePrefix}:${path}`];
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    // Handle partial matches so the following line works -.-
    // https://github.com/counterfactual/monorepo/blob/master/packages/node/src/store.ts#L54
    if (path.endsWith("channel") || path.endsWith("appInstanceIdToProposedAppInstance")) {
      const partialMatches = {};
      for (const k of Object.keys(storeObj)) {
        if (k.includes(`${path}/`)) {
          try {
            partialMatches[
              k.replace(`${ConnextClientStorePrefix}:`, "").replace(`${path}/`, "")
            ] = JSON.parse(storeObj[k]);
          } catch {
            partialMatches[
              k.replace(`${ConnextClientStorePrefix}:`, "").replace(`${path}/`, "")
            ] = storeObj[k];
          }
        }
      }
      return partialMatches;
    }
    return raw;
  },

  set: async (
    pairs,
    allowDelete,
  ) => {
    if (!storeObj) {
      storeObj = JSON.parse(fs.readFileSync(dbFile, "utf8") || "{}");
    }
    for (const pair of pairs) {
      storeObj[`${ConnextClientStorePrefix}:${pair.path}`] =
        typeof pair.value === "string" ? pair.value : JSON.stringify(pair.value);
    }
    fs.unlinkSync(dbFile);
    fs.writeFileSync(dbFile, JSON.stringify(storeObj, null, 2));
  },

}

module.exports = { store }
