import { basename, dirname, extname, resolve } from 'path';
import { BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { v4 as uuidV4 } from 'uuid';

import config from '../environment';

import * as fs from 'fs';
import * as QRCode from 'qrcode';
import * as util from 'util';
import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { fromPath } from 'pdf2pic';
import { CertificatesService } from '../certificates/certificates.service';
import { pdfToImageResponse } from '../dtos/pdfToImage.dto';
import { Conditional } from '../enum';
import { CertificateSheetLib } from '../lib/certificateSheet.lib';
import { Certificate } from '../models';
import { CERTIFICATE_SHEET_NAME, longDateFormat } from '../utils';
import { PdfService } from './services/pdf.service';

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
    let certificates = await this.certificatesService.getCertificatesList();

    certificates = await Promise.all(
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

            fs.rm(`${this.outputPath}/${path}`, { recursive: true }, (err) => {
              if (err) {
                throw err;
              }
            });
          } catch (err) {
            throw new Error('An error has occurred. Files were not generated.');
          }
        }
        return certificate;
      }),
    );

    this.updateColumnData('id', `${CERTIFICATE_SHEET_NAME}!A2`, certificates);
    this.updateColumnData(
      'certificateImgUrl',
      `${CERTIFICATE_SHEET_NAME}!K2`,
      certificates,
    );
    this.updateColumnData(
      'certificatePdfUrl',
      `${CERTIFICATE_SHEET_NAME}!L2`,
      certificates,
    );
    this.updateColumnData(
      'shouldBeGenerated',
      `${CERTIFICATE_SHEET_NAME}!Q2`,
      certificates,
    );
  }

  private getFilename(certificate: Certificate) {
    const attendee = `${certificate.name}-${certificate.lastname}`;

    return `${attendee}-${certificate.eventName.trim().replace(/\s/g, '-')}`;
  }

  private formatData(certificate: Certificate) {
    certificate.id = certificate.id || uuidV4();
    certificate.issueDate = longDateFormat(certificate.issueDate);
    certificate.name = certificate.name.trim().split(' ')[0];
    certificate.lastname = certificate.lastname.trim().split(' ')[0];
    certificate.shouldBeGenerated = Conditional.NO;

    const filename = this.getFilename(certificate);
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

    const responseQR = await this.upload(qrPath);

    if (!responseQR)
      throw new Error('QR code files was not upload to storage.');

    const templateUrl = `src/templates/${certificate.templateName}.html`;
    const template = fs.readFileSync(
      resolve(process.cwd(), templateUrl),
      'utf8',
    );

    const stylesContent = fs.readFileSync(
      resolve(process.cwd(), 'src/styles.css'),
      'utf8',
    );

    const responsePDF = await this.pdfService.generatePdfByTemplate(
      certificate,
      template,
      `${this.outputPath}/${certificate.certificatePdfUrl}`,
      `<style>${stylesContent}</style>`,
    );

    if (!responsePDF)
      throw new Error('An error has occurred. PDF file was not generate.');

    const responseImage = await this.generateImage(
      `${this.outputPath}/${certificate.certificatePdfUrl}`,
      `${this.outputPath}/${certificate.certificateImgUrl}`,
    );

    if (!responseImage)
      throw new Error('An error has occurred. Image file was not generate.');

    await Promise.all([
      this.upload(certificate.certificatePdfUrl),
      this.upload(certificate.certificateImgUrl),
    ]);
  }

  private async generateImage(inputPath: string, outputPath: string) {
    const options = {
      density: 100,
      saveFilename: basename(outputPath, extname(outputPath)),
      savePath: dirname(outputPath),
      format: 'png',
    };

    const storeAsImage = fromPath(inputPath, options);
    const pageToConvertAsImage = 1;

    try {
      const response = await storeAsImage(pageToConvertAsImage);
      fs.renameSync((response as pdfToImageResponse).path, outputPath);
      return true;
    } catch (err) {
      throw new Error(
        'An error has occurred. Pdf file was not converted to png.',
      );
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

  private updateColumnData(
    property: keyof Certificate,
    range: string,
    certificates: Certificate[],
  ) {
    const values = certificates.map((certificate) => certificate[property]);

    this.certificateSheetLib.setValues(range, 'COLUMNS', values);
  }
}
