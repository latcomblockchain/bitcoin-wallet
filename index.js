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

function init(){
  const {
    parent: {
      datadir,
      network
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
      datadir,
      network,
    }
  } = this;
  const db = dbFactory(datadir);
  const bitcoin = Blockexplorer(network);
  
  get(db)('pkey')
    .then(function(pkey){
      return new bitcoin.PrivateKey(pkey)
    })
    .then(function(pkey){
      return Promise.all([
        {
          pkey: pkey.toWIF(),
          addr: pkey.toAddress()
        },
        bitcoin.addr(pkey.toAddress().toString())
      ])
    })
    .then(printJSON)
    .catch(printJSON);
}

function addr(address){
  const {
    parent: {
      network,
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
      network,
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
      datadir,
      network,
      data
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
        .change(from);
      !!data && tx.addData(data);
      tx.sign(pkey);
      return bitcoin.txSend(tx.serialize());
    })
    .then(printJSON)
    .catch(printJSON);
}

function utxo(address){
  const {
    parent: {
      network
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
  .option('-d, --datadir <datadir>', 'Data directory', DEFAULT_DATA_DIR)
  .option('-n, --network <network>', 'Network type (livenet||testnet). Default: testnet', DEFAULT_NETWORK)
  .option('-m, --data <data>', 'Data for transaction', null);

program
  .command('init')
  .description('Init wallet data in <datadir>. Default directory: ~/.bitcoin-wallet')
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