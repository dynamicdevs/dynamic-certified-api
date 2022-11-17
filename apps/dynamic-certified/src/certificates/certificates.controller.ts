import { Controller, Get, Param } from '@nestjs/common';
import { CertificateResponseDto } from '../dtos/certificate.dto';
import { CertificatesService } from './certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(private certificateService: CertificatesService) {}

  @Get(':id')
  public async getCertificateById(
    @Param('id') id: string,
  ): Promise<CertificateResponseDto> {
    return this.certificateService.getCertificateById(id);
  }
}
