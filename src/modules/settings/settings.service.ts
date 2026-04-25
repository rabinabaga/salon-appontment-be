import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Settings } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

const settingsWithTemplate = Prisma.validator<Prisma.SettingsDefaultArgs>()({
  include: { activeTemplate: true },
});

export type SettingsWithTemplate = Prisma.SettingsGetPayload<typeof settingsWithTemplate>;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SettingsWithTemplate | null> {
    return this.prisma.settings.findFirst({
      include: { activeTemplate: true },
    });
  }

  async setActiveTemplate(templateId: string): Promise<SettingsWithTemplate> {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException(`Template ${templateId} not found`);

    const settings = await this.get();
    return this.prisma.settings.update({
      where: { id: settings!.id },
      data: { activeTemplateId: templateId },
      include: { activeTemplate: true },
    });
  }

async clearActiveTemplate(): Promise<Settings> {
  const settings = await this.get();

  return this.prisma.settings.update({
    where: { id: settings!.id },
    data: {
      activeTemplateId: null, // this alone is enough in Prisma
    },
  });
}

}