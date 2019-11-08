const constants = require('../dist/constants');

for (const dm of [
  {
    msg: '@Bot Hi, send @recipient (not @invalid) some money: $0.101.',
    expected: { recipient: 'recipient', amount: '0.10' }
  },
  {
    msg: '@Bot Hi, send @recipient (not @invalid) some money: $0.10.',
    expected: { recipient: 'recipient', amount: '0.10' }
  },
  {
    msg: '@Bot Hi, send @recipient (not @invalid) some money: $0.10',
    expected: { recipient: 'recipient', amount: '0.10' }
  },
  {
    msg: '@Bot Hi, send @recipient $0.10 and give @invalid like idk $100',
    expected: { recipient: 'recipient', amount: '0.10' }
  },
  {
    msg: '@Bot Hi, send @recipient some money: $0.10 or else!',
    expected: { recipient: 'recipient', amount: '0.10' }
  },
  {
    msg: '@Bot Hi, send @recipient some money: $0.10',
    expected: { recipient: 'recipient', amount: '0.10' }
  }
]) {
  const actual = dm.msg.match(constants.tipRegex('Bot'))
  if (!actual || !actual[2]) {
    throw new Error(`Expected a match for "${dm.msg}" but got ${JSON.stringify(actual)}`);
  }
  if (actual[1] !== dm.expected.recipient) {
    throw new Error(`Expected ${dm.expected.recipient} to match ${actual[1]}`);
  }
  if (actual[2] !== dm.expected.amount) {
    throw new Error(`Expected ${dm.expected.amount} to match ${actual[2]}`);
  }
}

console.log(`Regex tests Passed :)`);
