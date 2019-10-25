import { Logger as NestLogger} from '@nestjs/common';
import { arrayify, isHexString } from 'ethers/utils';

export const isValidHex = (hex: string, bytes: number): boolean =>
  isHexString(hex) && arrayify(hex).length === bytes;

export class Logger extends NestLogger {
  public cxt: string;
  public logLevel: number;
  constructor(context: string, logLevel: number) {
    super();
    this.cxt = context || 'Default';
    this.logLevel = logLevel || 3;
  }
  verbose(message: string): void {
    if (this.logLevel > 4) { super.verbose(message, this.cxt); }
  }
  debug(message: string): void {
    if (this.logLevel > 3) { super.debug(message, this.cxt); }
  }
  info(message: string): void {
    if (this.logLevel > 2) { super.log(message, this.cxt); }
  }
  warn(message: string): void {
    if (this.logLevel > 1) { super.warn(message, this.cxt); }
  }
  error(message: string, trace?: string): void {
    if (this.logLevel > 0) { super.error(message, trace, this.cxt); }
  }
}
