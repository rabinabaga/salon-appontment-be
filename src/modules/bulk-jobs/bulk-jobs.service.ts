import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as ExcelJS from 'exceljs';
import { PrismaService } from 'src/prisma/prisma.service';


export interface ExcelRow {
  customerName: string;
  customerEmail: string;
  service: string;
  date: string;
  startTime: string;
}

@Injectable()
export class BulkJobsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('bulk-notifications')
    private readonly bulkQueue: Queue,
  ) {}

  async uploadAndEnqueue(file: Express.Multer.File, user: any) {
    const rows = await this.parseExcel(file.path);

    const savedJob = await this.prisma.bulkJob.create({
      data: {
        uploadedBy: user.id,
        fileUrl: file.path,
        totalRows: rows.length,
        status: 'PENDING', // or use enum if defined in Prisma
      },
    });

    await this.bulkQueue.add(
      'process-bulk',
      { jobId: savedJob.id, rows },
      { attempts: 1 },
    );

    return savedJob;
  }

  async findAll(user: any) {
    return this.prisma.bulkJob.findMany({
      where: { uploadedBy: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.bulkJob.findUnique({
      where: { id },
      include: { logs: true }, // relation
    });

    if (!job) {
      throw new NotFoundException(`Bulk job ${id} not found`);
    }

    return job;
  }

  async getLogs(jobId: string) {
    return this.prisma.notificationLog.findMany({
      where: {bulkJobId: jobId }, // ⚠️ field name changes from bulkJobId → jobId
      orderBy: { processedAt: 'asc' },
    });
  }

  private async parseExcel(filePath: string): Promise<ExcelRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const rows: ExcelRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const values = row.values as any[];

      rows.push({
        customerName: String(values[1] ?? '').trim(),
        customerEmail: String(values[2] ?? '').trim(),
        service: String(values[3] ?? '').trim(),
        date: String(values[4] ?? '').trim(),
        startTime: String(values[5] ?? '').trim(),
      });
    });

    return rows.filter((r) => r.customerEmail && r.customerName);
  }
}