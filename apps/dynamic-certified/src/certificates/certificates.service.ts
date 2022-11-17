import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CertificateResponseDto } from '../dtos/certificate.dto';
import { CertificateSheetLib } from '../lib/certificateSheet.lib';
import { Certificate } from '../models';
import { toCamelCaseFromText } from '../utils';

@Injectable()
export class CertificatesService {
  constructor(private sheetLib: CertificateSheetLib) {}

  public async getCertificateById(
    certificateId: string,
  ): Promise<CertificateResponseDto> {
    const certificates = await this.getCertificatesList();
    const certificate = certificates.find((val) => {
      return val.id === certificateId;
    });

    if (!certificate) {
      throw new NotFoundException(
        `Certificate with id: ${certificateId} not found`,
      );
    }
    const { id, name, lastname, eventName, issueDate } = certificate;

    return {
      id,
      name,
      lastname,
      eventName,
      issueDate,
    };
  }

  public async getCertificatesList(): Promise<Certificate[]> {
    const response = await this.sheetLib.getAllDataFromSpreadsheet();
    if (!response.values[0]) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Empty headers in backend data format ',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return this.parseSheetDataToCertificatesList(response.values);
  }

  private parseSheetDataToCertificatesList(values: string[][]): Certificate[] {
    const certificates: Certificate[] = [];
    const keys = values[0].map((val) => toCamelCaseFromText(val));

    for (let j = 1; j < values.length; j++) {
      const certificate: Partial<Certificate> = {};
      const row = values[j];

      for (let i = 0; i < keys.length; i++) {
        certificate[keys[i]] = row[i];
      }

      certificates.push(certificate as Certificate);
    }

    return certificates;
  }
}
