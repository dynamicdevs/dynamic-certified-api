import { registerAs } from '@nestjs/config';
import * as dotenv from 'dotenv';
dotenv.config();

interface IEnvironment {
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
  spreadsheetId: string;
  certificatesUrl: string;
  assetsUrl: string;
  websiteUrl: string;
  azureStorageConnection: string;
  containerName: string;
}

export const environment: IEnvironment = {
  serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL,
  serviceAccountPrivateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY,
  spreadsheetId: process.env.SPREADSHEET_ID,
  certificatesUrl: process.env.CERTIFICATES_URL,
  assetsUrl: process.env.ASSETS_URL,
  websiteUrl: process.env.WEBSITE_URL,
  azureStorageConnection: process.env.AZURE_STORAGE_CONNECTION,
  containerName: process.env.CONTAINER_NAME,
};

export default registerAs('config', () => {
  return environment;
});
