import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import config from '@env';
import Joi from 'joi';
import { CertificatesModules } from '@certificates/certificates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV || '.env',
      load: [config],
      isGlobal: true,
    }),
    CertificatesModules,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
