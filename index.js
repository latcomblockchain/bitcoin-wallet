#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const program = require('commander');
const levelup = require('levelup');
const leveldown = require('leveldown');
const sb = require('satoshi-bitcoin');
const utils = require('./utils');
const Blockexplorer = require('./Blockexplorer');

const DEFAULT_DATA_DIR = path.resolve(utils.getUserHome(), '.bitcoin-wallet');
const DEFAULT_NETWORK = 'testnet';

const dbFactory = 
  (datadir = DEFAULT_DATA_DIR) => {
    const dir = path.resolve(datadir);
    !fs.existsSync(dir) && fs.mkdirSync(dir);
    return levelup(leveldown(dir));
  };

function get(db){
  return function(key){
    return utils.promisify(db.get.bind(db))(key)
      .then(function(data){
        return data.toString();
      });
  }
}

function put(db){
  return function(key, value){
    return utils.promisify(db.put.bind(db))(key, value);
  }
}

function printJSON(data){
  utils.compose(
    JSON.stringify,
    console.log
  )(data, null, 2)
}

function init(dir = DEFAULT_DATA_DIR){
  const {
    parent: {
      datadir = dir,
      network = DEFAULT_NETWORK
    }
  } = this;
  const db = dbFactory(datadir);
  const bitcoin = Blockexplorer(network);

  const pkey = bitcoin.PrivateKey.fromRandom(network);
  put(db)('pkey', pkey.toWIF())
    .then(function(){
      printJSON({
        pkey: pkey.toWIF(),
        addr: pkey.toAddress().toString()
      });
    })
    .catch(printJSON)
}

function info(){
  const {
    parent: {
      datadir = DEFAULT_DATA_DIR,
      network = DEFAULT_NETWORK,
    }
  } = this;
  const db = dbFactory(datadir);
  const bitcoin = Blockexplorer(network);
  
  get(db)('pkey')
    .then(function(pkey){
      return new bitcoin.PrivateKey(pkey)
    })
    .then(function(pkey){
      return bitcoin.addr(pkey.toAddress().toString())
    })
    .then(printJSON)
    .catch(printJSON);
}

function addr(address){
  const {
    parent: {
      network = DEFAULT_NETWORK,
    }
  } = this;
  const bitcoin = Blockexplorer(network);

  bitcoin.addr(address)
    .then(printJSON)
    .catch(printJSON);
}

function tx(txid){
  const {
    parent: {
      network = DEFAULT_NETWORK,
    }
  } = this;
  const bitcoin = Blockexplorer(network);
  
  bitcoin.tx(txid)
    .then(printJSON)
    .catch(printJSON);
}

function send(to, amount){
  const {
    parent: {
      datadir = DEFAULT_DATA_DIR,
      network = DEFAULT_NETWORK,
    }
  } = this;
  const db = dbFactory(datadir);
  const bitcoin = Blockexplorer(network);

  get(db)('pkey')
    .then(function(pkey){
      return new bitcoin.PrivateKey(pkey)
    })
    .then(function(pkey){
      const from = pkey.toAddress().toString();
      return Promise.all([
        Promise.resolve(pkey),
        Promise.resolve(from),
        bitcoin.utxo(from)
      ]);
    })
    .then(function([pkey, from, utxos]){
      const tx = new bitcoin.Transaction()
        .from(utxos, pkey.toPublicKey())
        .to(to, parseInt(amount))
        .change(from)
        .sign(pkey);
      return bitcoin.txSend(tx.serialize());
    })
    .then(printJSON)
    .catch(printJSON);
}

function utxo(address){
  const {
    parent: {
      network = DEFAULT_NETWORK,
    }
  } = this;
  const bitcoin = Blockexplorer(network);
  
  bitcoin.utxo(address)
    .then(printJSON)
    .catch(printJSON);
}

program
  .version('0.1.0')
  .usage('[options] <file ...>')
  .option('-d, --datadir <datadir>', 'Data directory')
  .option('-n, --network <network>', 'Network type (livenet||testnet). Default: testnet');

program
  .command('init [dir]')
  .description('Init wallet data in <dir>. Default directory: ~/.bitcoin-wallet')
  .action(init);

program
  .command('info')
  .description('Get information about wallet')
  .action(info);

program
  .command('addr <address>')
  .description('Get information about <address>')
  .action(addr);

program
  .command('tx <txid>')
  .description('Get information about transaction')
  .action(tx);

program
  .command('utxo <address>')
  .description('Get information about unspent outputs for <address>')
  .action(utxo);

program
  .command('send <to> <amount>')
  .description('Send <amount> satoshi from current wallet to <to>')
  .action(send);

program.parse(process.argv);