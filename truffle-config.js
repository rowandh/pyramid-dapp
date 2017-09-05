// Allows us to use ES6 in our migrations and tests.
require('babel-register')

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*' // Match any network id
    },
    ropsten: {
      host: 'localhost',
      port: 8545,
      network_id: '3',
      from: '0xE62890613414177d3cca9f9Ba8A61e4dc4232a01',
      gas: 4700000
    }
  }
}
