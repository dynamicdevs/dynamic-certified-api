import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import config from '@env';
import Joi from 'joi';
import { CertificatesModule } from '@certificates/certificates.module';
import { GeneratorModule } from './generator/generator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV || '.env',
      load: [config],
      isGlobal: true,
    }),
    CertificatesModule,
    GeneratorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
