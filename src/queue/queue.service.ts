import { Injectable } from '@nestjs/common';

import { Action } from './action';

@Injectable()
export class QueueService {
  private queue: Action[] = [];
  private current: any;

  public enqueue = (callback: any): Promise<any> => {
    return new Promise((resolve: any, reject: any): any => {
      const action = new Action(callback);
      this.queue.push(action);
      this.process();
      action.once('resolve', resolve);
      action.once('reject', reject);
    });
  }

  public process = async (): Promise<void> => {
    if (!this.current) {
      while (this.queue.length > 0) {
        this.current = this.queue.shift();
        await this.current.execute();
      }
      this.current = false;
    } else {
      console.log(`Queue processor is already running`);
    }
  }
}
