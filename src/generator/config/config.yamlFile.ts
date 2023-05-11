import * as utils from '../../utils';
const DEFAULT_CONTRACT_ADDRESS = 'INPUT CONTRACT ADDRESS';

export function generateConfigFile(
  path: string,
  abiNames: string[],
  abiPaths: string[],
) {
  console.log('Generate config.yaml File');

  let contractAddress = '';
  let contractPath = '';
  for (let i = 0; i < abiNames.length; i++) {
    let name = abiNames[i];
    let path = "./" + abiPaths[i].split("/").slice(2).join("/");
    if (name == abiNames[0]) {
      contractAddress += `${name}:
    - '${DEFAULT_CONTRACT_ADDRESS}'`;
      contractPath += `${name}:
    - '${path}'`;
    } else {
      contractAddress += `
  ${name}:
    - '${DEFAULT_CONTRACT_ADDRESS}'`;

      contractPath += `
  ${name}:
    - '${path}'`;
    }
  }

  let configContent = `urls:
  api: 'https://devnet-api.multiversx.com'
  swagger:
    - 'https://devnet-microservice.multiversx.com'
    - 'https://testnet-microservice.multiversx.com'
    - 'https://microservice.multiversx.com'
  redis: '127.0.0.1'
wallet:
  ${contractAddress}
abi:
  ${contractPath}
database:
  host: 'localhost'
  port: 3306
  username: 'root'
  password: 'root'
  name: 'example'
features:
  publicApi:
    enabled: true
    port: 3000
  privateApi:
    enabled: true
    port: 4000
  cacheWarmer:
    enabled: true
    port: 5201
  transactionProcessor:
    enabled: true
    port: 5202
    maxLookBehind: 100
  queueWorker:
    enabled: true
    port: 8000
  keepAliveAgent:
    enabled: true
nativeAuth:
  maxExpirySeconds:
  acceptedOrigins:
    - utils.multiversx.com
security:
  admins:
rateLimiterSecret:
keepAliveTimeout:
  downstream: 61000
  upstream: 60000
useCachingInterceptor: false
  `;
  utils.writeFile(path, configContent);
}
