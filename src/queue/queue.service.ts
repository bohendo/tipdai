import { Injectable } from '@nestjs/common';

import { Action } from './action';

@Injectable()
export class QueueService {
  private queue: Action[] = [];
  private current: any;

  public enqueue = (label: string, callback: any): Promise<any> => {
    return new Promise((resolve: any, reject: any): any => {
      console.log(`Enqueueing ${label}`);
      const action = new Action(callback);
      action.once('resolve', (res: any) => {
        console.log(`Action ${label} resolved! ${res}`);
        resolve(res);
      });
      action.once('reject', (res: any) => {
        console.log(`Action ${label} rejected! ${res}`);
        reject(res);
      });
      this.queue.push(action);
      console.log(`Adding action to queue`);
      this.process();
      console.log(`Listening for the result`);
    });
  }

  public process = async (): Promise<void> => {
    console.log(`Processing queue`);
    if (!this.current) {
      console.log(`No current action, starting to process now..`);
      while (this.queue.length > 0) {
        console.log(`There are ${this.queue.length} actions queued, dealing w the first now`);
        this.current = this.queue.shift();
        await this.current.execute();
        console.log(`Done dealing w this action, moving on`);
      }
      console.log(`Done dealing w all actions, stopping processor`);
      this.current = false;
    } else {
      console.log(`Queue processor is already running`);
    }
  }
}
