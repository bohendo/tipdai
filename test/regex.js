const constants = require("../dist/constants");

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
