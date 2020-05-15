import { Controller, Get, Query } from "@nestjs/common";

import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello(@Query() query: any): Promise<string> {
    return await this.appService.getHello(query);
  }

  @Get("crc")
  async triggerCRC(): Promise<string> {
    return await this.appService.triggerCRC();
  }

}
