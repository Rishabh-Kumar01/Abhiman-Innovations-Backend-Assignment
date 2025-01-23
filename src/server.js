import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { kafkaConfig } from "./config/kafka.js";
import { startConsumers } from "./consumers/index.js";
import pollRoutes from "./routes/pollRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { AppError } from "./utils/error.js";
import pollExpirationCron from "./cron/pollExpirationCron.js";
import { socketService } from "./config/socket.js";
import { createServer } from "http";
import cors from "cors";

dotenv.config();

const prisma = new PrismaClient();

async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw new AppError("Database connection failed", 500);
  }
}

async function initializeKafka() {
  try {
    await kafkaConfig.connectProducer();
    await kafkaConfig.connectConsumer();
    await startConsumers();
    console.log("Kafka initialized successfully");
  } catch (error) {
    console.error("Kafka initialization failed:", error);
    throw new AppError("Message broker initialization failed", 500);
  }
}

async function gracefulShutdown(server) {
  console.log("Initiating graceful shutdown...");

  // Stop accepting new requests
  server.close(async () => {
    console.log("Server stopped accepting new connections");

    try {
      // Disconnect Kafka producer and consumer
      await kafkaConfig.disconnectProducer();
      await kafkaConfig.disconnectConsumer();
      console.log("Kafka connections closed");

      // Close database connection
      await prisma.$disconnect();
      console.log("Database connection closed");

      console.log("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      console.error("Error during graceful shutdown:", error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 30000);
}

async function startServer() {
  try {
    // Initialize essential services
    await connectDatabase();
    await initializeKafka();

    // Create an Express application
    const app = express();

    // Configure CORS for HTTP requests
    app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
      })
    );

    // Create an HTTP server
    const httpServer = createServer(app);

    // Initialize socket.io
    socketService.initialize(httpServer);

    // Request parsing middleware
    app.use(express.json({ limit: "10kb" }));
    app.use(express.urlencoded({ extended: true, limit: "10kb" }));

    // Logging middleware
    if (process.env.NODE_ENV === "development") {
      app.use(morgan("dev"));
    }

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "success",
        message: "Server is healthy",
        timestamp: new Date().toISOString(),
      });
    });

    // API routes
    app.use("/polls", pollRoutes);
    app.use("/leaderboard", leaderboardRoutes);

    // Handle undefined routes
    app.all("*", (req, res, next) => {
      next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
    });

    // Global error handling middleware
    app.use(errorHandler);

    // Start the server
    const PORT = process.env.PORT || 3000;
    const server = httpServer.listen(PORT, () => {
      console.log(
        `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
      );
    });

    // Start the poll expiration cron job
    pollExpirationCron.startCron();
    console.log("Poll expiration cron job started");

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (err) => {
      console.error("UNHANDLED REJECTION! 💥 Shutting down...");
      console.error(err.name, err.message);
      gracefulShutdown(server);
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
      console.error(err.name, err.message);
      gracefulShutdown(server);
    });

    // Handle termination signals
    process.on("SIGTERM", () => {
      console.log("SIGTERM received. Starting graceful shutdown...");
      gracefulShutdown(server);
    });

    process.on("SIGINT", () => {
      console.log("SIGINT received. Starting graceful shutdown...");
      gracefulShutdown(server);
    });

    return server;
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
startServer();
