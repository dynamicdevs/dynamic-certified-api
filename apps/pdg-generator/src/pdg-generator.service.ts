import { Injectable } from '@nestjs/common';

@Injectable()
export class PdgGeneratorService {
  getHello(): string {
    return 'Hello World!';
  }
}
