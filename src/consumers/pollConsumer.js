import { kafkaConfig } from "../config/kafka.js";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/error.js";
import { PollRepository } from "../repositories/pollRepository.js";

export class PollConsumer {
  constructor() {
    this.consumer = kafkaConfig.getConsumer();
    this.prisma = new PrismaClient();
    this.topic = process.env.KAFKA_TOPIC;
    this.pollRepository = new PollRepository();
  }

  async startConsumer() {
    try {
      await this.consumer.subscribe({
        topic: this.topic,
        fromBeginning: true,
      });

      await this.consumer.run({
        partitionsConsumedConcurrently: 3,
        eachMessage: async ({ topic, partition, message }) => {
          try {
            console.log(`Processing message from partition ${partition}`);
            const voteData = JSON.parse(message.value.toString());

            await this.processVote(voteData);

            console.log("Vote processed successfully:", voteData);
          } catch (error) {
            console.error("Error processing message:", error);
            // Don't throw here - we want to continue processing other messages
            // Instead, we could implement a dead letter queue
            await this.handleFailedMessage(message, error);
          }
        },
      });

      console.log("Consumer started successfully");
    } catch (error) {
      console.error("Failed to start consumer:", error);
      throw new AppError("Failed to start vote processing", 503);
    }
  }

  async processVote(voteData) {
    const { pollId, optionId, userId } = voteData;

    try {
      await this.pollRepository.createVote(pollId, optionId, userId);
    } catch (error) {
      if (error.code === "P2002") {
        console.warn("Duplicate vote detected:", voteData);
        // This is a duplicate vote - we can safely ignore it
        return;
      }
      throw error;
    }
  }

  async handleFailedMessage(message, error) {
    // Implement dead letter queue logic here
    // For now, we'll just log the error
    console.error("Failed to process message:", {
      message: message.value.toString(),
      error: error.message,
    });
  }

  async stopConsumer() {
    try {
      await this.consumer.stop();
      console.log("Consumer stopped successfully");
    } catch (error) {
      console.error("Error stopping consumer:", error);
    }
  }
}
