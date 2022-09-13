import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { Certificate } from '@models';
import { CERTIFICATE_SHEET_NAME, longDateFormat } from '@utils';
import { CertificateSheetLib } from '@lib/certificateSheet.lib';
import { CertificatesService } from '@certificates/certificates.service';
import { Conditional } from '@enum';
import { ConfigType } from '@nestjs/config';
import { Inject, Injectable } from '@nestjs/common';
import { PdfService } from './services/pdf.service';
import { resolve } from 'path';
import { v4 as uuidV4 } from 'uuid';

import config from '@env';
import nodeHtmlToImage from 'node-html-to-image';

import * as fs from 'fs';
import * as QRCode from 'qrcode';
import * as util from 'util';

@Injectable()
export class GeneratorService {
  private websiteUrl: string;
  private azureConnection: string;
  private containerName: string;
  private certificatesUrl: string;
  private assetsUrl: string;
  private qrFilename: string;
  private outputPath: string;

  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
    private certificatesService: CertificatesService,
    private pdfService: PdfService,
    private certificateSheetLib: CertificateSheetLib,
  ) {
    this.websiteUrl = this.configService.websiteUrl;
    this.azureConnection = this.configService.azureStorageConnection;
    this.containerName = this.configService.containerName;
    this.certificatesUrl = this.configService.certificatesUrl;
    this.assetsUrl = this.configService.assetsUrl;
    this.outputPath = 'src/ouputs';
    this.qrFilename = 'code-qr.png';
  }

  public async generateCerficates() {
    const certificates = await this.certificatesService.getCertificatesList();

    const values = await Promise.all(
      certificates.map(async (certificate) => {
        if (
          certificate.shouldBeGenerated &&
          certificate.shouldBeGenerated.trim().toLocaleUpperCase() ===
            Conditional.YES
        ) {
          certificate = this.formatData(certificate);

          const path = `${certificate.eventCode}/${certificate.id}`;

          if (!fs.existsSync(`${this.outputPath}/${path}`)) {
            fs.mkdirSync(`${this.outputPath}/${path}`, { recursive: true });
          }

          try {
            await this.generateFiles(certificate, path);
          } catch (err) {
            throw new Error(err);
          }

          fs.rm(`${this.outputPath}/${path}`, { recursive: true }, (err) => {
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

  private getFilename(certificate: Certificate) {
    const attendee = `${certificate.name}-${certificate.lastname}`;

    return `${attendee}-${certificate.eventName.trim().replace(/\s/g, '-')}`;
  }

  private formatData(certificate: Certificate) {
    const filename = this.getFilename(certificate);
    certificate.id = certificate.id || uuidV4();
    certificate.issueDate = longDateFormat(certificate.issueDate);
    certificate.name = certificate.name.trim().split(' ')[0];
    certificate.lastname = certificate.lastname.trim().split(' ')[0];

    const path = `${certificate.eventCode}/${certificate.id}/${filename}`;
    certificate.certificateImgUrl = `${path}.png`;
    certificate.certificatePdfUrl = `${path}.pdf`;

    return certificate;
  }

  private async generateFiles(certificate: Certificate, path: string) {
    const qrPath = `${path}/${this.qrFilename}`;
    const qrContent = `${this.websiteUrl}/${certificate.id}`;

    const response = await this.generateQR(qrPath, qrContent);

    if (!response) throw new Error('QR code was not generated');

    const responseQR = this.upload(qrPath);

    if (!responseQR)
      throw new Error('QR code files was not upload to storage.');

    const templateUrl = `src/generator/templates/${certificate.templateName}.html`;
    const template = fs.readFileSync(
      resolve(process.cwd(), templateUrl),
      'utf8',
    );

    const responsePDF = await this.pdfService.generatePdfByTemplate(
      certificate,
      template,
      `${this.outputPath}/${certificate.certificatePdfUrl}`,
    );

    if (responsePDF) this.upload(certificate.certificatePdfUrl);

    const responseImage = await this.generateImage(
      certificate,
      template,
      `${this.outputPath}/${certificate.certificateImgUrl}`,
    );

    if (responseImage) this.upload(certificate.certificateImgUrl);
  }

  private async generateImage<Type>(
    data: Type,
    template: string,
    path: string,
  ) {
    const options = {
      html: template,
      content: [
        {
          ...data,
          certificatesUrl: this.certificatesUrl,
          assetsUrl: this.assetsUrl,
          output: path,
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
    try {
      await QRCode.toFile(`${this.outputPath}/${path}`, value);
      return true;
    } catch (err) {
      throw new Error(err);
    }
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

  private async upload(path: string) {
    const localPath = `${this.outputPath}/${path}`;

    if (fs.existsSync(localPath)) {
      try {
        const readFile = util.promisify(fs.readFile);
        const data = await readFile(localPath);
        const blobClient = this.getBlobClient(path);
        await blobClient.uploadData(data);
        return true;
      } catch (err) {
        throw new Error(err);
      }
    }
  }
}
