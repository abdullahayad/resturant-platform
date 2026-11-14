import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppService } from './app.service';
import { homePage, langOf } from './site/site.controller';

// The website's home page when the request comes in on ligeta.app itself;
// the API host (api.ligeta.app) keeps its plain root response.
const SITE_HOSTS = new Set(['ligeta.app', 'www.ligeta.app']);

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Query('lang') lang?: string): string {
    const host = (req.hostname ?? '').toLowerCase();
    if (SITE_HOSTS.has(host) || lang) {
      res.type('html');
      return homePage(langOf(lang));
    }
    return this.getHello();
  }

  getHello(): string {
    return this.appService.getHello();
  }
}
