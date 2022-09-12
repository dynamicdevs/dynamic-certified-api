import { ConfigType } from '@nestjs/config';
import { create } from 'pdf-creator-node';
import { Inject, Injectable } from '@nestjs/common';
import { Orientation, PageSize } from '@enum';

import config from '@env';

@Injectable()
export class PdfService {
  private certificatesUrl: string;
  private assetsUrl: string;

  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {
    this.certificatesUrl = this.configService.certificatesUrl;
    this.assetsUrl = this.configService.assetsUrl;
  }

  public async generatePdfByTemplate<Type>(
    data: Type,
    template: string,
    path: string,
    filename: string,
  ) {
    const options = {
      format: PageSize.A4,
      orientation: Orientation.LANDSCAPE,
    };

    const document = {
      html: template,
      data: {
        ...data,
        certificatesUrl: this.certificatesUrl,
        assetsUrl: this.assetsUrl,
      },
      path: `${path}/${filename}.pdf`,
      type: '',
    };

    try {
      await create(document, options);
      return true;
    } catch (err) {
      throw new Error(err);
    }
  }
}
