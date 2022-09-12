import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import config from '@env';
import * as Joi from 'joi';
import { CertificatesModule } from '@certificates/certificates.module';
import { GeneratorModule } from './generator/generator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV || '.env',
      load: [config],
      isGlobal: true,
      validationSchema: Joi.object({
        SERVICE_ACCOUNT_EMAIL: Joi.string().email().required(),
        SERVICE_ACCOUNT_PRIVATE_KEY: Joi.string().required(),
        SPREADSHEET_ID: Joi.string().required(),
        CERTIFICATES_URL: Joi.string().required(),
        WEBSITE_URL: Joi.string().required(),
        AZURE_STORAGE_CONNECTION: Joi.string().required(),
        CONTAINER_NAME: Joi.string().required(),
      }),
    }),
    CertificatesModule,
    GeneratorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
