import { EventEmitter } from 'events';

import { Logger } from '../utils';

export class Action extends EventEmitter {
  private callback: any;
  private log: Logger;

  constructor(callback: any, logLevel: number) {
    super();
    this.callback = callback;
    this.log = new Logger('Action', logLevel || 3);
  }

  async execute(): Promise<void> {
    try {
      this.log.info(`Executing action!`);
      const result = await this.callback();
      this.log.info(`Executed action successfully! Resolving..`);
      this.emit('resolve', result);
    } catch (e) {
      this.log.warn(`Failed to execute action! Rejecting..`);
      this.emit('reject', e);
    }
  }
}
