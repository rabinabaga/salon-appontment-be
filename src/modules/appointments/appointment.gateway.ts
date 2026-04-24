import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * AppointmentsGateway
 * -------------------
 * Clients subscribe to a specific date+service room.
 * When any booking is created, updated, confirmed, or cancelled on that
 * date+service, the server broadcasts the updated available slots to
 * everyone watching that room — so users see stale slots disappear in real time.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/appointments',
})
export class AppointmentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppointmentsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Appointments WS client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Appointments WS client disconnected: ${client.id}`);
  }

  /**
   * Client sends: { serviceId, date }
   * Server puts the client in room `slots:{serviceId}:{date}`
   */
  @SubscribeMessage('subscribe-slots')
  handleSubscribeSlots(
    @MessageBody() data: { serviceId: string; date: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.roomKey(data.serviceId, data.date);
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
  }

  @SubscribeMessage('unsubscribe-slots')
  handleUnsubscribeSlots(
    @MessageBody() data: { serviceId: string; date: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(this.roomKey(data.serviceId, data.date));
  }

  /**
   * Called by AppointmentsService after any mutation that affects slot availability.
   * Pushes the fresh list of available slots to everyone watching this date+service.
   */
  broadcastSlotsUpdate(serviceId: string, date: string, availableSlots: string[]) {
    const room = this.roomKey(serviceId, date);
    this.server.to(room).emit('slots-updated', { serviceId, date, availableSlots });
    this.logger.log(`Broadcast slots-updated to ${room}: ${availableSlots.length} slots`);
  }

  private roomKey(serviceId: string, date: string): string {
    return `slots:${serviceId}:${date}`;
  }
}