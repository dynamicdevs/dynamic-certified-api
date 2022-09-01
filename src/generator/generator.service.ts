import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { Certificate } from '@models';
import { CERTIFICATE_SHEET_NAME, longDateFormat } from '@utils';
import { CertificateSheetLib } from '@lib/certificateSheet.lib';
import { CertificatesService } from '@certificates/certificates.service';
import { Conditional, Template } from '@enum';
import { ConfigType } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';
import { PdfService } from './services/pdf.service';
import config from '@env';
import nodeHtmlToImage from 'node-html-to-image';
import { resolve } from 'path';

import * as fs from 'fs';
import * as QRCode from 'qrcode';
import * as util from 'util';

@Injectable()
export class GeneratorService {
  private websiteUrl: string;
  private azureConnection: string;
  private containerName: string;
  private urlBase: string;

  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private certificatesService: CertificatesService,
    private pdfService: PdfService,
    private certificateSheetLib: CertificateSheetLib,
  ) {
    this.websiteUrl = this.configService.websiteUrl;
    this.azureConnection = this.configService.azureStorageConnection;
    this.containerName = this.configService.containerName;
    this.urlBase = this.configService.urlBase;
  }

  public async generateCerficates() {
    const certificates = await this.certificatesService.getCertificatesList();

    const values = await Promise.all(
      certificates.map(async (certificate) => {
        if (
          certificate.shouldBeGenerated !== undefined &&
          certificate.shouldBeGenerated.trim().toLocaleUpperCase() ===
            Conditional.YES
        ) {
          certificate.issueDate = longDateFormat(certificate.issueDate);
          certificate.name = certificate.name.trim().split(' ')[0];
          certificate.lastname = certificate.lastname.trim().split(' ')[0];

          const path = `src/outputs/${certificate.eventCode}/${certificate.id}`;
          const storagePath = `${certificate.eventCode}/${certificate.id}`;
          const filename = this.getFilename(certificate);

          const templateUrl = `src/generator/templates/${certificate.templateName}.html`;
          const template = fs.readFileSync(
            resolve(process.cwd(), templateUrl),
            'utf8',
          );

          const response = await this.generateQR(path, certificate.id);

          if (!response) return;

          const responseQR = this.upload(path, storagePath, 'code-qr.png');

          if (!responseQR) return;

          const responsePDF = await this.pdfService.generatePdfByTemplate(
            certificate,
            template,
            path,
            filename,
          );

          if (responsePDF) this.upload(path, storagePath, `${filename}.pdf`);

          const responseImage = await this.generateImage(
            certificate,
            template,
            path,
            filename,
          );

          if (responseImage) this.upload(path, storagePath, `${filename}.png`);

          fs.rm(path, { recursive: true }, (err) => {
            if (err) {
              throw err;
            }
          });

          return Conditional.NO;
        }
        return;
      }),
    );

    const range = `${CERTIFICATE_SHEET_NAME}!Q2`;

    this.certificateSheetLib.setValues(range, 'COLUMNS', values);
  }

  private async generateImage<Type>(
    data: Type,
    template: string,
    path: string,
    filename: string,
  ) {
    const options = {
      html: template,
      content: [
        {
          ...data,
          urlBase: this.urlBase,
          output: `${path}/${filename}.png`,
        },
      ],
    };

    try {
      await nodeHtmlToImage(options);
      return true;
    } catch (err) {
      throw new Error(err);
    }
  }

  private async generateQR(path: string, value: string) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, { recursive: true });
    }

    const url = `${this.websiteUrl}/${value}`;

    try {
      await QRCode.toFile(`${path}/code-qr.png`, url);
      return true;
    } catch (err) {
      throw new Error(err);
    }
  }

  private getFilename(certificate: Certificate) {
    const attendee = `${certificate.name}-${certificate.lastname}`;

    return `${attendee}-${certificate.eventName.trim().replace(/\s/g, '-')}`;
  }

  private getBlobClient(fileName: string): BlockBlobClient {
    const blobClientService = BlobServiceClient.fromConnectionString(
      this.azureConnection,
    );
    const containerClient = blobClientService.getContainerClient(
      this.containerName,
    );
    const blobClient = containerClient.getBlockBlobClient(fileName);
    return blobClient;
  }

  private async upload(
    localPath: string,
    storagePath: string,
    fileName: string,
  ) {
    if (fs.existsSync(localPath)) {
      try {
        const readFile = util.promisify(fs.readFile);
        const data = await readFile(`${localPath}/${fileName}`);
        const blobClient = this.getBlobClient(`${storagePath}/${fileName}`);
        await blobClient.uploadData(data);
        return true;
      } catch (err) {
        throw new Error(err);
      }
    }
  }
}
