import { GeneratorController } from './generator.controller';
import { GeneratorService } from './generator.service';
import { Module } from '@nestjs/common';
import { PdfService } from './services/pdf.service';
import { CertificatesModule } from '../certificates/certificates.module';
import { CertificateSheetLib } from '../lib/certificateSheet.lib';

@Module({
  imports: [CertificatesModule],
  controllers: [GeneratorController],
  providers: [GeneratorService, PdfService, CertificateSheetLib],
})
export class GeneratorModule {}
