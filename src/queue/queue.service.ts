import { Injectable } from '@nestjs/common';

import { ConfigService } from '../config/config.service';
import { Logger } from '../utils';

import { Action } from './action';

@Injectable()
export class QueueService {
  private queue: Action[] = [];
  private current: any;
  private log: Logger;

  public constructor(
    private readonly config: ConfigService,
  ) {
    this.log = new Logger('QueueService', this.config.logLevel);
  }

  public enqueue = (label: string, callback: any): Promise<any> => {
    return new Promise((resolve: any, reject: any): any => {
      this.log.info(`Enqueueing ${label}`);
      const action = new Action(callback, this.config.logLevel);
      action.once('resolve', (res: any) => {
        this.log.info(`Action ${label} resolved! ${res}`);
        resolve(res);
      });
      action.once('reject', (res: any) => {
        this.log.error(`Action ${label} rejected! ${res}`);
        reject(res);
      });
      this.log.info(`Adding action to queue. There are ${this.queue.length} other actions pending.`);
      this.queue.push(action);
      this.process();
    });
  }

  public process = async (): Promise<void> => {
    this.log.info(`Processing queue of ${this.queue.length} actions..`);
    if (!this.current) {
      this.log.info(`Nothing is currently being processed, started to process actions now!`);
      while (this.queue.length > 0) {
        this.log.info(`There are ${this.queue.length} actions queued, dealing w the first now`);
        this.current = this.queue.shift();
        await this.current.execute();
        this.log.info(`Done dealing w this action, moving on`);
      }
      this.log.info(`Done dealing w all actions, stopping processor`);
      this.current = false;
    } else {
      this.log.info(`Queue processor is already running`);
    }
  }
}
