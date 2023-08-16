import * as fs from 'fs';
import * as utils from '../utils';
import * as endpointsGenerator from './endpoints/';
import * as userCustomGenerator from './userCustom/';
// import * as graphqlGenerator from './graphqh/';
import * as warmer from './cache';
import { Function, MxbiConfig } from '../config';
import { type } from 'os';

export interface RecordType {
  name: string;
  originalType: string;
  postgresMappingType: string;
  indexed: boolean;
  root: boolean;
  list: string | undefined;
  trailing_str: string | undefined;
}

export interface TrackingEvent {
  identifier: string;
  inputs: RecordType[];
  mainStruct?: RecordType;
}

export class AbiGenerator {
  folderPath: string;
  name: string;
  jsonAbi: any;
  isEmpty = false;
  trackingEvents: string[];
  data: TrackingEvent[];

  constructor(
    abiPath: string,
    folderPath: string,
    needInputAddress: string[],
    mxbiConfig: MxbiConfig,
  ) {
    const jsonContent = fs.readFileSync(abiPath, { encoding: 'utf8' });
    this.jsonAbi = JSON.parse(jsonContent);
    this.name = utils.generateVariableName(
      this.jsonAbi.buildInfo.contractCrate.name,
    );
    this.folderPath = folderPath;

    //List all events:
    const trackingEvents = this.jsonAbi.events.map((v: any) => v.identifier);
    if (trackingEvents.length == 0) {
      this.isEmpty = true;
    }
    this.trackingEvents = trackingEvents;
    this.data = this.prepareData();
  }

  getEventTypes(): string[] {
    return this.trackingEvents.map((v) => utils.generateClassName(v));
  }

  isEmptyEvent(): boolean {
    return this.isEmpty;
  }

  getName(): string {
    return this.name;
  }

  private isSystemType(t: string): boolean {
    const match = t.match(/^List<(.+)>$/);
    let typeToCheck = t;

    if (match !== null) {
      typeToCheck = match[1]; // If t is "List<X>", typeToCheck becomes X
    }

    return this.jsonAbi.types[typeToCheck] === undefined;
  }

  processGroups(
    groups: RecordType[][],
    vName: string,
    mainStruct: string,
  ): string[] {
    return groups.map((group) => {
      return group
        .map((v) => {
          return `${vName}Entity.${v.name} = ${v.list?.replace(
            /__/g,
            '.',
          )}.map((v: any) => ${this.topicDataMap2(
            v,
            0,
            mainStruct,
            v.trailing_str!,
          )})`;
        })
        .join('\n');
    });
  }

  private recursiveArguments(
    t: string,
    prefix: string = '',
    list: string | undefined,
    trailing_str: string | undefined,
  ): RecordType[] {
    if (this.jsonAbi.types[t].type == 'enum') {
      console.log(`HELLO ${t} ${prefix}`);
      let recordtype: RecordType = {
        name: prefix + '__name',
        originalType: 'string',
        postgresMappingType: 'string',
        indexed: false,
        root: false,
        list: list,
        trailing_str: trailing_str,
      };
      return [recordtype];
    }
    return this.jsonAbi.types[t].fields.map((v: any) => {
      let name = prefix !== '' ? `${prefix}__${v.name}` : v.name;
      trailing_str = trailing_str !== undefined ? v.name : undefined;
      if (this.isSystemType(v.type)) {
        console.log(`SYSTEM TYPE ${v.type}\n`);
        let recordtype: RecordType = {
          name: name,
          originalType: v.type,
          postgresMappingType: list
            ? utils.abiTypeMapping(v.type, utils.TypeMapping.Postgres) + '[]'
            : utils.abiTypeMapping(v.type, utils.TypeMapping.Postgres),
          indexed: v.indexed ?? false,
          root: false,
          list: list,
          trailing_str: trailing_str,
        };
        return recordtype;
      } else {
        console.log(`NOT SYSTEM TYPE ${v.type}\n`);
        const match = v.type.match(/^List<(.+)>$/);
        if (match !== null) {
          return this.recursiveArguments(match[1], name, name, '');
        }
        return this.recursiveArguments(v.type, name, undefined, undefined);
      }
    });
  }

  private prepareData(): TrackingEvent[] {
    return this.jsonAbi.events.map((v: any) => {
      let mainStruct = undefined;
      const inputs = (v.inputs as any[]).map((v: any) => {
        if (this.isSystemType(v.type)) {
          let recordtype: RecordType = {
            name: v.name,
            originalType: v.type,
            postgresMappingType: utils.abiTypeMapping(
              v.type,
              utils.TypeMapping.Postgres,
            ),
            indexed: v.indexed ?? false,
            root: true,
            list: undefined, //TODO We need to handle it if the root event is a list type
            trailing_str: undefined,
          };
          return recordtype;
        } else {
          mainStruct = {
            name: v.name,
            originalType: v.type,
            postgresMappingType: '',
            indexed: v.indexed ?? false,
          };
          return this.recursiveArguments(v.type, v.name, undefined, undefined);
        }
      });

      let event: TrackingEvent = {
        identifier: v.identifier,
        inputs: inputs.flat(Infinity) as RecordType[],
        mainStruct: mainStruct,
      };
      return event;
    });
  }

  writeEntity(path: string) {
    path = `${path}/${this.name}.entity.ts`;

    let content = `/* eslint-disable eol-last */
import { Column, Entity, PrimaryColumn } from "typeorm";

${this.data
  .map((v) => {
    return `
@Entity()
export class ${utils.generateClassName(v.identifier)} {
  /// Default columns
  @PrimaryColumn()
  id: string;

  @Column()
  txHash: string;

  @Column({ nullable: true })
  timestamp: number;

  @Column()
  contractAddress: string;

  ${v.inputs
    .map((input) => {
      return `
@Column(${
        input.originalType == 'List<bytes>' || input.list
          ? '"text", { array: true, nullable: true }'
          : '{ nullable: true }'
      })
${input.name}: ${input.postgresMappingType};
`;
    })
    .join('\n')}
}

`;
  })
  .join('\n')}

      `;
    utils.writeFile(path, content);
  }

  writeService(path: string) {
    const className = utils.generateClassName(this.name);
    path = `${path}/${this.name}.service.ts`;

    let content = `/* eslint-disable eol-last */
import { DataSource } from "typeorm";
import * as mxApis from "./../../common/mx-apis/";
import * as codec from "../../common/codec/";

import {
  AbiRegistry,
  BinaryCodec,
} from "@multiversx/sdk-core/out";
import * as fs from "fs";
import * as Entity from "./${this.name}.entity";
import { Config } from "src/common/config";
import { CrawledTransactions } from "../entity";

export class ${className}CrawlerService {
  addresses: string[];
  events: string[];
  dataSource: DataSource;
  abi: AbiRegistry;
  config: Config;

  constructor(
    config: Config,
    dataSource: DataSource
  ) {
    const abiPath = config.getContractAbiPath("${this.name}");
    const abi = this.getAbiRegistry(abiPath);
    if (abi != undefined) {
      this.abi = abi;
    }

    this.addresses = config.getContractAddress("${this.name}");
    this.events = ${JSON.stringify(this.trackingEvents)};
    this.dataSource = dataSource;
    this.config = config;
  }

  getAbiRegistry(path: string): AbiRegistry | undefined {
    const data = fs.readFileSync(path, { encoding: "utf-8" });
    return AbiRegistry.create(JSON.parse(data));
  }

    async saveToDb(events: mxApis.Event[]) {
          for (const e of events) {
            switch (e.eventName) {
      ${this.data
        .map((v: any) => {
          let vName = utils.generateVariableName(v.identifier);
          let cName = utils.generateClassName(v.identifier);

          return `case '${v.identifier}': {
      let ${vName}Repository = this.dataSource.getRepository(Entity.${cName});
      let ${vName}Entity = new Entity.${utils.generateClassName(
            v.identifier,
          )}();

      ${vName}Entity.id = e.id;
      ${vName}Entity.txHash = e.txHash;
      ${vName}Entity.timestamp = e.timestamp;
      ${vName}Entity.contractAddress = e.address;

${
  v.mainStruct !== undefined
    ? `let ${v.mainStruct?.name}= new BinaryCodec()
      .decodeTopLevel(e.data, this.abi.getStruct("${v.mainStruct?.originalType}"))
        .valueOf();
`
    : ''
}

      ${v.inputs
        .map((input: any, index: number) => {
          console.log(`INPUT: ${JSON.stringify(input)} \n\n`);
          if (input.list) {
            return '';
          }
          return `${vName}Entity.${input.name} = ${this.topicDataMap(
            input,
            index + 1,
            v.mainStruct?.name,
          )}`;
        })
        .join('\n')}
      ${this.processGroups(
        groupByList(v.inputs),
        vName,
        v.mainStruct?.name,
      ).join('\n')}
      ${vName}Entity = await ${utils.generateVariableName(
            v.identifier,
          )}Repository.save(${vName}Entity);
      break;

}`;
        })
        .join('\n')}
      }
    }
  }

  async getCheckpoint(): Promise<number> {
    let repository = this.dataSource.getRepository(CrawledTransactions);
    const entity = await repository.findOne({ where: { abiName: "${
      this.name
    }" } });

    if (entity) {
      // The entity with the specified name was found
      console.log(entity);
      return entity.count;
    } else {
      // No entity with the specified name was found
      console.log('No entity found.');
      return 0;
    }

  }
  async saveCheckpoint(value: number) {
    let repository = this.dataSource.getRepository(CrawledTransactions);
    let entity = await repository.findOne({ where: { abiName: "${
      this.name
    }" } });

    if (entity) {
      // The entity with the specified name was found
      console.log(entity);
      entity.count += value;
      await repository.save(entity);
    } else {
      // No entity with the specified name was found
      console.log('No entity found.');
      let newEntity = new CrawledTransactions();
      newEntity.abiName = '${this.name}';
      newEntity.count = value;
      await repository.save(newEntity);
    }
    console.log("New checkpoint saved");
  }

  async run() {
    while (true) {
      await Promise.all(
        this.addresses.map(async (address) => {
          const txCount = await mxApis.txCount(address);
          let begin = await this.getCheckpoint();

          console.log(txCount);
          if (txCount <= begin) {
            console.log("All txs were crawled");
            return;
          }
          const size = this.config.getBatchSize();

          let promises = [];
          for (let from = begin; from < txCount; from += size) {
            promises.push(
              (async () => {
                const result = await mxApis.TxHashes(address, from, size);
                const txHashes = result[0];
                const count = result[1];

                const acceptedEventsPromises = txHashes.map(async (hash) => {
                  let txDetails = await mxApis.getTransactionDetail(hash);
                  return mxApis.filterEvent(this.events, txDetails);
                });

                const events = await Promise.all(acceptedEventsPromises);
                const acceptedEvents = [].concat(...events); // Flatten the array of arrays.

                // saveToDb will be call after crawling each batch
                // TODO: checkpoint need to be saved
                await this.saveToDb(acceptedEvents);
                await this.saveCheckpoint(count);
              })(),
            );
          }

          // Wait for all promises to resolve.
          await Promise.all(promises);
        }),
      );
    }
  }
}

`;
    utils.writeFile(path, content);
  }

  topicDataMap2(
    v: RecordType,
    index: number,
    mainStructName: string,
    name: string,
  ): string {
    if (v.root == true && this.isSystemType(v.originalType)) {
      let args = v.indexed ? `e.topics[${index}]` : `e.data`;
      switch (v.originalType) {
        case 'u8':
          return `codec.decodeU8(${args})`;
        case 'u32':
          return `codec.decodeU32(${args})`;
        case 'BigUint':
          return `codec.decodeBigUint(${args})`;
        case 'Address':
          return `codec.decodeAddress(${args})`;
        default:
          return `//TODO: !!!!!`;
      }
    } else {
      let extend = '';
      switch (v.originalType) {
        case 'Address': {
          extend = '.bech32()';
          break;
        }
        case 'bytes': {
          return `codec.encodeBytes(v.${name.replace(/__/g, '.')})`;
        }
        case 'List<bytes>': {
          return `codec.encodeArrayBytes(v.${name.replace(/__/g, '.')})`;
        }

        default:
          extend = '.valueOf()';
          break;
      }
      return `v.${name.replace(/__/g, '.')}${extend}`;
    }
  }
  topicDataMap(v: RecordType, index: number, mainStructName: string): string {
    if (v.root == true && this.isSystemType(v.originalType)) {
      let args = v.indexed ? `e.topics[${index}]` : `e.data`;
      switch (v.originalType) {
        case 'u8':
          return `codec.decodeU8(${args})`;
        case 'u32':
          return `codec.decodeU32(${args})`;
        case 'BigUint':
          return `codec.decodeBigUint(${args})`;
        case 'Address':
          return `codec.decodeAddress(${args})`;
        default:
          return `//TODO: !!!!!`;
      }
    } else {
      let extend = '';
      switch (v.originalType) {
        case 'Address': {
          extend = '.bech32()';
          break;
        }
        case 'bytes': {
          return `codec.encodeBytes(${mainStructName}.${v.name.replace(
            /__/g,
            '.',
          )})`;
        }
        case 'List<bytes>': {
          return `codec.encodeArrayBytes(${mainStructName}.${v.name.replace(
            /__/g,
            '.',
          )})`;
        }

        default:
          extend = '.valueOf()';
          break;
      }
      return `${v.name.replace(/__/g, '.')}${extend}`;
    }
  }

  generate_new_backend() {
    let crawlerPath = `${this.folderPath}/crawler/${this.name}`;

    if (!fs.existsSync(crawlerPath)) {
      fs.mkdirSync(crawlerPath, {
        recursive: true,
      });
    }

    this.writeEntity(crawlerPath);
    this.writeService(crawlerPath);
  }
}

function groupByList(inputArray: RecordType[]): RecordType[][] {
  const groupedByList = inputArray.reduce((grouped, item) => {
    if (item.list !== undefined) {
      if (!grouped[item.list]) {
        grouped[item.list] = [];
      }

      grouped[item.list].push(item);
    }

    return grouped;
  }, {} as Record<string, RecordType[]>);

  return Object.values(groupedByList);
}
