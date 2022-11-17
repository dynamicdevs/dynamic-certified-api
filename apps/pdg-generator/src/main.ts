import { NestFactory } from '@nestjs/core';
import { PdgGeneratorModule } from './pdg-generator.module';
import { PdgGeneratorService } from './pdg-generator.service';

export async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PdgGeneratorModule);
  const appService = app.get(PdgGeneratorService);
  console.log(appService.getHello());
}
bootstrap()