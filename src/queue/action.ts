import { EventEmitter } from 'events';

export class Action extends EventEmitter {
  private callback: any;

  constructor(callback: any) {
    super();
    this.callback = callback;
  }

  async execute(): Promise<void> {
    try {
      const result = await this.callback();
      this.emit('resolve', result);
    } catch (e) {
      this.emit('reject', e);
    }
  }
}
