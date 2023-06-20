import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as constants from './defaultConstants';

export class Function {
  name?: string;
  cache_disable?: boolean;
  abi_name?: string;
  redis_ttl?: number;
  gas_limit?: number;
  warm_enable?: boolean;
  default_args?: Record<string, any[]>[] = [];
}

export class Network {
  chain_id?: string;
  proxy_url?: string;
  redis_url?: string;
}

export class MxbiConfig {
  network: Network;
  functions: Function[] = [];
  needInputAddress: string[] = [];

  constructor(filename: string) {
    const doc = yaml.load(fs.readFileSync(filename, 'utf8')) as Record<
      string,
      any
    >;

    this.network = new Network();
    this.network.chain_id = doc.network?.chain_id || constants.DEFAULT_CHAIN_ID;
    this.network.proxy_url =
      doc.network?.proxy_url || constants.DEFAULT_RPC_ENDPOINT;
    this.network.redis_url =
      doc.network?.redis_url || constants.DEFAULT_REDIS_URL;

    this.functions =
      doc.functions?.map((func: any) => ({
        redis_ttl: func.redis_ttl,
        gas_limit: func.gas_limit,
        name: func.name,
        abi_name: func.abi_name,
        cache_disable: func.cache_disable,
        warm_enable: func.warm?.enable || false,
        default_args: func.default_args as Record<string, any>[],
      })) || [];
    this.needInputAddress = doc.needInputAddress || [];
    console.log(`mxbi_config.yaml load:\n ${JSON.stringify(this, null, 2)}\n`);
  }

  writeMxbiConfig() {
    // Convert JavaScript object to YAML
    const yamlStr = yaml.dump(this);

    // Write YAML string to file
    fs.writeFileSync('mxbi_config.yaml', yamlStr);
  }

  getNetwork(): Network {
    return this.network!;
  }

  getFunctions(): Function[] {
    return this.functions;
  }

  getNeedInputAddress(): string[] {
    return this.needInputAddress;
  }
}

export function createDefaultMxbiConfig() {
  let default_yaml_file = `network:
  - chain_id: ${constants.DEFAULT_CHAIN_ID} 
  - proxy_url: ${constants.DEFAULT_RPC_ENDPOINT}
`;
  fs.writeFileSync('mxbi_config.yaml', default_yaml_file);
}

export function isExistConfig(path: string) {
  return fs.existsSync(path + '/mxbi_config.yaml');
}

export function isExistPackageJson(path: string) {
  return fs.existsSync(path + '/package.json');
}
export * from './defaultConstants';
