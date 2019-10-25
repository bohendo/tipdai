import { EntityManager, EntityRepository, Repository } from 'typeorm';

import { ChannelRecord } from './channel.entity';

type StringKeyValue = { [path: string]: StringKeyValue };

@EntityRepository(ChannelRecord)
export class ChannelRecordRepository extends Repository<ChannelRecord> {
  async reset(): Promise<void> {
    await this.clear();
  }

  async get(path: string): Promise<StringKeyValue | string | undefined> {
    let res;
    // FIXME: this queries for all channels or proposed app instances, which
    // are nested under the respective keywords, hence the 'like' keyword
    // Action item: this hack won't be needed when a more robust schema around
    // node records is implemented
    if (path.endsWith('channel') || path.endsWith('appInstanceIdToProposedAppInstance')) {
      res = await this.createQueryBuilder('node_records')
        .where('node_records.path like :path', { path: `%${path}%` })
        .getMany();
      const nestedRecords = res.map((record: ChannelRecord) => {
        const existingKey = Object.keys(record.value)[0];
        const leafKey = existingKey.split('/').pop()!;
        const nestedValue = record.value[existingKey];
        delete record.value[existingKey];
        record.value[leafKey] = nestedValue;
        return record.value;
      });
      const records = {};
      nestedRecords.forEach((record: any): void => {
        const key = Object.keys(record)[0];
        const value = Object.values(record)[0];
        // FIXME: the store implementation (firebase) that the cf core used in the
        // very first implementation of the store assumed that values which are
        // null wouldn't contain key entries in the returned object so we have to
        // explicitly remove these when Postgres correctly returns even null values
        if (value !== null) {
          records[key] = value;
        }
      });
      return records;
    }
    res = await this.findOne({ path });
    if (!res) {
      return undefined;
    }
    return res.value[path];
  }

  async set(pairs: Array<{ path: string; value: any }>): Promise<void> {
    for (const pair of pairs) {
      // Wrapping the value into an object is necessary for Postgres bc the JSON column breaks
      // if you use anything other than JSON (i.e. a raw string).
      // In some cases, the cf core code is inserting strings as values instead of objects :(
      const record = { path: pair.path, value: { [pair.path]: pair.value } };
      await this.save(record);
    }
  }
}
