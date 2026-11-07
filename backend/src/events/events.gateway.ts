import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinRoleRoom')
  handleJoinRoom(client: Socket, role: string) {
    if (role) {
      const r = role.toLowerCase();
      client.join(`role:${r}`);
      if (r === 'waiter') client.join('role:staff');
      if (r === 'staff') client.join('role:waiter');
      this.logger.log(`Client ${client.id} joined room: role:${r}`);
    }
  }

  notifyNewOrder(order: any) {
    this.server.emit('order:created', order);
    this.server.emit('kitchen:new_order', order);
    this.server.to('role:chef').emit('kitchen:new_order', order);
    this.server.to('role:manager').emit('manager:order_update', order);
    this.server.to('role:admin').emit('admin:order_update', order);
  }

  notifyItemStatusUpdated(item: any) {
    this.server.emit('order:item_status_changed', item);
    if (item.status === 'READY') {
      this.server.emit('order:item_ready', item);
      this.server.to('role:staff').emit('order:item_ready', item);
      this.server.to('role:waiter').emit('order:item_ready', item);
    }
  }

  notifyFoodAvailability(availability: any) {
    this.server.emit('menu:availability_updated', availability);
  }

  notifyTableStatus(table: any) {
    this.server.emit('table:status_updated', table);
  }

  notifyBillRequested(data: any) {
    this.server.emit('billing:requested', data);
    this.server.to('role:manager').emit('billing:requested', data);
    this.server.to('role:admin').emit('billing:requested', data);
  }

  notifyBillPaid(data: any) {
    this.server.emit('billing:paid', data);
  }

  notifyPermissionsUpdated(roleId?: string) {
    this.server.emit('auth:permissions_updated', { roleId });
  }

  notifySettingsUpdated(settings: any) {
    this.server.emit('settings:updated', settings);
  }

  notifyPlatformBroadcast(broadcast: any) {
    if (this.server) {
      this.server.emit('platform:broadcast', broadcast);
    }
  }

  getConnectedClientsCount(): number {
    try {
      return (this.server?.engine as any)?.clientsCount || 0;
    } catch {
      return 0;
    }
  }
}
