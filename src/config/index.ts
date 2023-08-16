import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as constants from './defaultConstants';

export class Function {
  name?: string;
  cache_enable?: boolean;
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
  default_ttl?: number;
}

export class MxbiConfig {
  private network: Network;
  private functions: Function[] = [];
  private needInputAddress: string[] = [];

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
    this.network.default_ttl =
      doc.network?.default_ttl || constants.DEFAULT_TTL;

    this.functions =
      doc.functions?.map((func: any) => ({
        redis_ttl: func.redis_ttl,
        gas_limit: func.gas_limit,
        name: func.name,
        abi_name: func.abi_name,
        cache_enable: func.cache_enable,
        warm_enable: func.warm?.enable || false,
        default_args: func.default_args as Record<string, any>[],
      })) || [];
    this.needInputAddress = doc.needInputAddress || [];
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

  getNeedInputAddress(): string[] {
    return this.needInputAddress;
  }

  getCustomWarmerFns(abiName: string): Function[] {
    return this.functions.filter(
      (v) =>
        v.abi_name == abiName &&
        v.warm_enable == true &&
        v.default_args != undefined,
    );
  }

  needRemoveWarmer(abiName: string): string[] {
    return this.functions
      .filter((v) => v.abi_name == abiName && v.warm_enable == false)
      .map((v) => v.name!)
      .filter((v) => v !== undefined);
  }

  isCacheEnable(abiName: string, name: string): boolean {
    const v = this.functions.filter((v) => {
      return v.abi_name == abiName && v.name == name;
    });
    if (v.length > 0) {
      return v[0].cache_enable ?? true;
    }
    return true;
  }

  redisTtl(abiName: string, name: string): number | undefined {
    const v = this.functions.filter((v) => {
      return v.abi_name == abiName && v.name == name;
    });
    if (v.length > 0) {
      return v[0].redis_ttl;
    }
    return undefined;
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
