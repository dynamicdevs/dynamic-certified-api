import { ConfigType } from '@nestjs/config';
import { create } from 'pdf-creator-node';
import { Inject, Injectable } from '@nestjs/common';
import { Orientation, PageSize } from '@enum';
import { readFileSync } from 'fs';

import config from '@env';
import { resolve } from 'path';

@Injectable()
export class PdfService {
  private urlBase: string;

  constructor(
    @Inject(config.KEY) private configService: ConfigType<typeof config>,
  ) {
    this.urlBase = this.configService.urlBase;
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
        urlBase: this.urlBase,
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
