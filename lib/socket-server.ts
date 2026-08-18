import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    socket.on("join:item", (itemId: string) => {
      socket.join(`item:${itemId}`);
    });

    socket.on("join:conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("join:user", (userId: string) => {
      socket.join(`user:${userId}`);
    });

    socket.on("join:admin", () => {
      socket.join("admin");
    });

    socket.on("join:security", () => {
      socket.join("security");
    });

    socket.on("location:update", (data: { itemId: string; lat: number; lng: number }) => {
      io?.to(`item:${data.itemId}`).emit("location:updated", data);
      io?.emit("items:refresh");
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToRoom(room: string, event: string, data: unknown) {
  io?.to(room).emit(event, data);
}

export function emitNewMessage(conversationId: string, message: unknown) {
  io?.to(`conversation:${conversationId}`).emit("message:new", message);
}

export function emitNotification(userId: string, notification: unknown) {
  io?.to(`user:${userId}`).emit("notification:new", notification);
}

export function emitItemsRefresh() {
  io?.emit("items:refresh");
}
