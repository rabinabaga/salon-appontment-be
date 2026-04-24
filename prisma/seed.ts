import { PrismaClient, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Seed a user
  const user = await prisma.user.upsert({
    where: { email: 'test1@example.com' },
    update: {},
    create: {
      email: 'test1@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Test User',
    },
  });

  // 2. Seed a service
  const service = await prisma.service.upsert({
    where: { id: 'service-seed-id' },
    update: {},
    create: {
      id: 'service-seed-id',
      name: 'General Consultation',
      duration: 30, // minutes
      isActive: true,
      price: 500,
    },
  });

  // 3. Seed appointments
  const appointments = [
    {
      date: new Date('2025-05-01'),
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      status: AppointmentStatus.PENDING,
    },
    {
      date: new Date('2025-05-01'),
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      status: AppointmentStatus.PENDING,
    },
    {
      date: new Date('2025-05-02'),
      startTime: new Date('1970-01-01T14:00:00'),
      endTime: new Date('1970-01-01T14:30:00'),
      status: AppointmentStatus.PENDING,
    },
  ];

  for (const appt of appointments) {
    await prisma.appointment.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        date: appt.date,
        startTime: appt.startTime,
        endTime: appt.endTime,
        duration: service.duration,
        status: appt.status,
      },
    });
  }

  console.log('Seeded user, service, and appointments');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });