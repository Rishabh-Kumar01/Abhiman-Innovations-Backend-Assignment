import { kafkaConfig } from "../config/kafka.js";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/error.js";
import { PollRepository } from "../repositories/pollRepository.js";
import { socketService } from "../config/socket.js";

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
      // Start a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        // Create the vote record
        await prisma.vote.create({
          data: {
            pollId,
            pollOptionId: optionId,
            userId,
          },
        });

        // Increment vote counts
        await prisma.pollOption.update({
          where: { id: optionId },
          data: {
            voteCount: {
              increment: 1,
            },
          },
        });

        await prisma.poll.update({
          where: { id: pollId },
          data: {
            totalVoteCount: {
              increment: 1,
            },
          },
        });

        // Fetch updated poll data
        const updatedPoll = await prisma.poll.findUnique({
          where: { id: pollId },
          include: {
            options: {
              select: {
                id: true,
                text: true,
                voteCount: true,
              },
            },
          },
        });

        return updatedPoll;
      });

      // Calculate percentages and prepare broadcast data
      const pollData = {
        ...result,
        options: result.options.map((option) => ({
          ...option,
          percentage:
            result.totalVoteCount > 0
              ? ((option.voteCount / result.totalVoteCount) * 100).toFixed(2)
              : "0.00",
        })),
      };

      // Broadcast update to all clients viewing this poll
      socketService.broadcastPollUpdate(pollId, pollData);
    } catch (error) {
      console.error("Error processing vote:", error);
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
