import { Injectable } from "@nestjs/common";

import { ConfigService } from "../config/config.service";
import { LoggerService } from "../logger/logger.service";

import { Action } from "./action";

@Injectable()
export class QueueService {
  private queue: Action[] = [];
  private current: any;

  public constructor(
    private readonly config: ConfigService,
    private readonly log: LoggerService,
  ) {
    this.log.setContext("QueueService");
  }

  public enqueue = (callback: any): Promise<any> => {
    return new Promise((resolve: any, reject: any): any => {
      const action = new Action(callback);
      action.once('resolve', resolve);
      action.once('reject', reject);
      this.log.info(`Adding action to queue. There are ${this.queue.length} other actions pending.`);
      this.queue.push(action);
      this.process();
    });
  }

  public process = async (): Promise<void> => {
    if (!this.current) {
      this.log.debug(`Nothing is currently being processed, started to process actions now!`);
      while (this.queue.length > 0) {
        this.current = this.queue.shift();
        await this.current.execute();
        this.log.info(`Done processing action, there are ${this.queue.length} actions remaining.`);
      }
      this.current = false;
    } else {
      this.log.debug(`Queue processor is already running`);
    }
  }
}
