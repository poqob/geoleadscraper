import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AppService } from './app.service';
import { ExtractWebsiteDto } from './app.dto';

@Controller()
export class AppController {
  constructor(private appService: AppService) {}

  /** Health check — used by the extension to detect an available backend. */
  @HttpCode(HttpStatus.OK)
  @Get()
  async health() {
    return { status: 'ok', service: 'geoleadscraper-api' };
  }

  /** Extract contacts (emails, phones, socials) from a list of websites. */
  @HttpCode(HttpStatus.OK)
  @Post('extract-website')
  async extractWebsite(@Body() body: ExtractWebsiteDto) {
    const { urls } = body;
    return this.appService.extractWebsites({ urls });
  }
}
