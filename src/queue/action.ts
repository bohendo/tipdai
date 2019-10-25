import { EventEmitter } from 'events';

export class Action extends EventEmitter {
  private callback: any;

  constructor(callback: any) {
    super();
    this.callback = callback;
  }

  async execute(): Promise<void> {
    try {
      console.log(`Executing action!`);
      const result = await this.callback();
      console.log(`Executed action successfully! Resolving..`);
      this.emit('resolve', result);
    } catch (e) {
      console.log(`Failed to execute action! Rejecting..`);
      this.emit('reject', e);
    }
  }
}
