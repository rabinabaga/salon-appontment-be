import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding notification templates...');

  // Clean existing templates
  await prisma.notificationTemplate.deleteMany();

  const templates = await prisma.notificationTemplate.createMany({
    data: [
      {
        name: 'Formal Confirmation',
        subject: 'Your Appointment is Confirmed',
        body: `Dear {customerName},

We are pleased to confirm your appointment at our salon.

Appointment Details:
- Service: {service}
- Date: {date}
- Time: {time}

Please arrive 5 minutes before your scheduled time. If you need to reschedule or cancel, please contact us in advance.

Thank you for choosing us.

Warm regards,
The Salon Team`,
      },
      {
        name: 'Friendly Reminder',
        subject: 'See You Soon, {customerName}!',
        body: `Hi {customerName}! 👋

Just a quick confirmation — you're all booked in!

✂️ Service: {service}
📅 Date: {date}
🕐 Time: {time}

We can't wait to see you. If anything comes up, just give us a heads up!

See you soon,
The Salon Team`,
      },
      {
        name: 'Minimal Confirmation',
        subject: 'Appointment Confirmed — {service}',
        body: `Hello {customerName},

Your appointment has been confirmed.

{service} | {date} | {time}

See you then!

— The Salon Team`,
      },
    ],
  });

  console.log(`Seeded ${templates.count} notification templates.`);

  // Create default settings pointing to first template
  const firstTemplate = await prisma.notificationTemplate.findFirst({
    where: { name: 'Formal Confirmation' },
  });

  if (firstTemplate) {
    // Upsert settings — only one row ever exists
    await prisma.settings.upsert({
      where: { id: 'default' },
      update: { activeTemplateId: firstTemplate.id },
      create: { id: 'default', activeTemplateId: firstTemplate.id },
    });
    console.log(`Default active template set to: ${firstTemplate.name}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });