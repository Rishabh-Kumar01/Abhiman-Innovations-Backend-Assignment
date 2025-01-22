import { Kafka } from "kafkajs";
import { AppError } from "../utils/error.js";

class KafkaConfig {
  constructor() {
    this.kafka = new Kafka({
      clientId: "polling-app",
      brokers: process.env.KAFKA_BROKERS.split(","),
      retry: {
        initialRetryTime: 100,
        retries: 5,
      },
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });

    this.consumer = this.kafka.consumer({
      groupId: "poll-votes-group",
      sessionTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });
  }

  async connectProducer() {
    try {
      await this.producer.connect();
      console.log("Producer connected successfully");
    } catch (error) {
      console.error("Failed to connect producer:", error);
      throw new AppError("Failed to connect to message broker", 503);
    }
  }

  async connectConsumer() {
    try {
      await this.consumer.connect();
      console.log("Consumer connected successfully");
    } catch (error) {
      console.error("Failed to connect consumer:", error);
      throw new AppError("Failed to connect to message broker", 503);
    }
  }

  async disconnectProducer() {
    try {
      await this.producer.disconnect();
      console.log("Producer disconnected successfully");
    } catch (error) {
      console.error("Failed to disconnect producer:", error);
    }
  }

  async disconnectConsumer() {
    try {
      await this.consumer.disconnect();
      console.log("Consumer disconnected successfully");
    } catch (error) {
      console.error("Failed to disconnect consumer:", error);
    }
  }

  getProducer() {
    return this.producer;
  }

  getConsumer() {
    return this.consumer;
  }
}

export const kafkaConfig = new KafkaConfig();
