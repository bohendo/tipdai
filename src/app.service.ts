import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(authUrl): string {
    if (authUrl) {
      return `Hello World!<br/>Join the tip bot army: ${authUrl}`;
    }
    return 'Hello World!';
  }
}
