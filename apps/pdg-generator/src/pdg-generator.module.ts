import { Module } from '@nestjs/common';
import { PdgGeneratorService } from './pdg-generator.service';

@Module({
  providers: [PdgGeneratorService],
})
export class PdgGeneratorModule {}
