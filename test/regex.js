const constants = require("../dist/constants");

// Test regex for parsing discord tips
for (const dm of [
  {
    msg: "Hey <@!713383231814107176> please give <@!387368307533152274> $100 thanks",
    expected: { recipient: "387368307533152274", amount: "100" },
  },
]) {
  const actual = dm.msg.match(constants.discordTipRegex("713383231814107176"));
  if (!actual || !actual[3]) {
    throw new Error(`Expected 3 matches for "${dm.msg}" but got ${JSON.stringify(actual)}`);
  }
  if (actual[2] !== dm.expected.recipient) {
    throw new Error(`Expected ${dm.expected.recipient} to match ${actual[2]}`);
  }
  if (actual[3] !== dm.expected.amount) {
    throw new Error(`Expected "${dm.expected.amount}" to match "${actual[3]}"`);
  }
}

// Test regex for parsing twitter tips
for (const dm of [
  {
    msg: "@TipDai Hi, send @recipient some money: $0.10 or else! #TipDai",
    expected: { recipient: "recipient", amount: "0.10" },
  },
  {
    msg: "@recipient @TipDai @TipDai send @recipient_ $5 please. #TipDai",
    expected: { recipient: "recipient_", amount: "5" },
  },
  {
    msg: "@recipient @TipDai @TipDai send @recipient $5 please. #TipDai",
    expected: { recipient: "recipient", amount: "5" },
  },
  {
    msg: "@recipient @TipDai @TipDai send @recipient $0.10 please.#TipDai",
    expected: { recipient: "recipient", amount: "0.10" },
  },
  {
    msg: "@TipDai Hi, send @recipient (not @invalid) some money: $0.101.#TipDai",
    expected: { recipient: "recipient", amount: "0.10" },
  },
  {
    msg: "@TipDai Hi, send @recipient (not @invalid) some money: $0.10.  #TipDai",
    expected: { recipient: "recipient", amount: "0.10" },
  },
  {
    msg: "@TipDai Hi, send @recipient (not @invalid) some money: $0.10#TipDai",
    expected: { recipient: "recipient", amount: "0.10" },
  },
  {
    msg: "@TipDai Hi, send @recipient $0.10 and give @invalid like idk $100.#TipDai",
    expected: { recipient: "recipient", amount: "0.10" },
  },
  {
    msg: "@TipDai Hi, send @recipient some money: $0.10.. #TipDai",
    expected: { recipient: "recipient", amount: "0.10" },
  },
]) {
  const actual = dm.msg.match(constants.twitterTipRegex("TipDai"));
  if (!actual || !actual[3]) {
    throw new Error(`Expected 3 matches for "${dm.msg}" but got ${JSON.stringify(actual)}`);
  }
  if (actual[2] !== dm.expected.recipient) {
    throw new Error(`Expected ${dm.expected.recipient} to match ${actual[2]}`);
  }
  if (actual[3] !== dm.expected.amount) {
    throw new Error(`Expected "${dm.expected.amount}" to match "${actual[3]}"`);
  }
}

console.log(`Regex tests Passed :)`);
