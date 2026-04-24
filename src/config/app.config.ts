import { ConfigModuleOptions } from '@nestjs/config/dist/interfaces';
import envConfig from './env.config';


export const appConfigs: ConfigModuleOptions = {
  isGlobal: true,
  envFilePath: '.env',
  load: [envConfig]}