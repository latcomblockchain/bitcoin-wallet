# Simple bitcoin console wallet
Application uses api [testnet.blockexplorer.com](https://testnet.blockexplorer.com) or [blockexplorer.com](https://blockexplorer.com)

```
Usage: bitcoin-wallet [options] <file ...>


Options:

  -V, --version            output the version number
  -d, --datadir <datadir>  Data directory
  -n, --network <network>  Network type (livenet||testnet). Default: testnet
  -h, --help               output usage information


Commands:

  init [dir]          Init wallet data in <dir>. Default directory: ~/.bitcoin-wallet
  info                Get information about wallet
  addr <address>      Get information about <address>
  tx <txid>           Get information about transaction
  utxo <address>      Get information about unspent outputs for <address>
  send <to> <amount>  Send <amount> satoshi from current wallet to <to>
```