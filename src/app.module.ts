import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { Prisma } from '@prisma/client';
import { MailModule } from './modules/auth/mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule, MailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
