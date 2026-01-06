import { ConfigModuleOptions } from '@nestjs/config';
import { validationSchema } from './validation.schema';

export const configOptions: ConfigModuleOptions = {
  isGlobal: true,
  envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
  validationSchema,
};
