import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

import { BulkJobsService } from './bulk-jobs.service';
import { BulkJobsController } from './bulk-jobs.controller';


import { MailModule } from '../mail/mail.module';
import { SettingsModule } from '../settings/settings.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BulkNotificationProcessor } from './bulk-notification.processor';
import { BulkNotificationGateway } from './bulk -notification.gateway';

@Module({
  imports: [
    PrismaModule, 

    BullModule.registerQueue({ name: 'bulk-notifications' }),

    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['.xlsx', '.xls'];
        if (!allowed.includes(extname(file.originalname).toLowerCase())) {
          return cb(new Error('Only Excel files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),

    MailModule,
    SettingsModule,
  ],
  providers: [
    BulkJobsService,
    BulkNotificationProcessor,
    BulkNotificationGateway
  ],
  controllers: [BulkJobsController],
})
export class BulkJobsModule {}