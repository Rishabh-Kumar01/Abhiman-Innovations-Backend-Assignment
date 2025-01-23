import { Server } from "socket.io";
import { AppError } from "../utils/error.js";

class SocketService {
  constructor() {
    this.io = null;
    // Track users in each poll room
    this.pollRooms = new Map();
  }

  initialize(server) {
    console.log("Initializing Socket.IO server...");
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      // Handle joining a poll room
      socket.on("join-poll", (pollId) => {
        try {
          const roomName = `poll-${pollId}`;
          socket.join(roomName);

          // Track user in poll room
          if (!this.pollRooms.has(roomName)) {
            this.pollRooms.set(roomName, new Set());
          }
          this.pollRooms.get(roomName).add(socket.id);

          console.log(`Client ${socket.id} joined room ${roomName}`);

          // Emit current viewers count
          const viewersCount = this.pollRooms.get(roomName).size;
          this.io.to(roomName).emit("viewers-update", { count: viewersCount });
        } catch (error) {
          console.error("Error joining poll room:", error);
          socket.emit("error", { message: "Failed to join poll room" });
        }
      });

      console.log("Socket.IO server initialized successfully");

      // Handle leaving a poll room
      socket.on("leave-poll", (pollId) => {
        try {
          const roomName = `poll-${pollId}`;
          socket.leave(roomName);

          // Remove user from poll room tracking
          if (this.pollRooms.has(roomName)) {
            this.pollRooms.get(roomName).delete(socket.id);

            // Emit updated viewers count
            const viewersCount = this.pollRooms.get(roomName).size;
            this.io
              .to(roomName)
              .emit("viewers-update", { count: viewersCount });
          }

          console.log(`Client ${socket.id} left room ${roomName}`);
        } catch (error) {
          console.error("Error leaving poll room:", error);
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        // Remove user from all poll rooms they were in
        this.pollRooms.forEach((users, roomName) => {
          if (users.delete(socket.id)) {
            const viewersCount = users.size;
            this.io
              .to(roomName)
              .emit("viewers-update", { count: viewersCount });
          }
        });
      });
    });
  }

  // Method to broadcast poll updates to all connected clients in a poll room
  broadcastPollUpdate(pollId, pollData) {
    try {
      const roomName = `poll-${pollId}`;
      this.io.to(roomName).emit("poll-update", pollData);
    } catch (error) {
      console.error("Error broadcasting poll update:", error);
    }
  }
}

export const socketService = new SocketService();
