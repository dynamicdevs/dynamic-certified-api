import { Controller, Post } from '@nestjs/common';
import { GeneratorService } from './generator.service';

@Controller('generator')
export class GeneratorController {
  constructor(private generatorService: GeneratorService) {}

  @Post('certificates')
  public GeneratorCertificate() {
    return this.generatorService.generateCerficates();
  }
}
