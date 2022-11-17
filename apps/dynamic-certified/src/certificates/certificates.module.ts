import { Module } from '@nestjs/common';
import { CertificateSheetLib } from '../lib/certificateSheet.lib';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificateSheetLib],
  exports: [CertificatesService],
})
export class CertificatesModule {}
