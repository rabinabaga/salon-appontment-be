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

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/bulk-jobs',
})
export class BulkNotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BulkNotificationGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Client subscribes to updates for a specific job */
  @SubscribeMessage('subscribe-job')
  handleSubscribe(
    @MessageBody() data: { jobId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`job:${data.jobId}`);
    this.logger.log(`Client ${client.id} subscribed to job ${data.jobId}`);
  }

  @SubscribeMessage('unsubscribe-job')
  handleUnsubscribe(
    @MessageBody() data: { jobId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`job:${data.jobId}`);
  }

  emitJobStarted(jobId: string, totalRows: number) {
    this.server.to(`job:${jobId}`).emit('job-started', { jobId, totalRows });
  }

  emitRowProcessed(jobId: string, payload: {
    rowIndex: number;
    total: number;
    processedCount: number;
    successCount: number;
    failCount: number;
    customerEmail: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
  }) {
    this.server.to(`job:${jobId}`).emit('row-processed', { jobId, ...payload });
  }

  emitJobCompleted(jobId: string, summary: {
    successCount: number;
    failCount: number;
    total: number;
  }) {
    this.server.to(`job:${jobId}`).emit('job-completed', { jobId, ...summary });
  }
}