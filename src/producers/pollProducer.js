import { kafkaConfig } from "../config/kafka.js";
import { AppError } from "../utils/error.js";

export class PollProducer {
  constructor() {
    this.producer = kafkaConfig.getProducer();
    this.topic = process.env.KAFKA_TOPIC;
  }

  async sendVote(voteData) {
    try {
      const message = {
        key: String(voteData.pollId),
        value: JSON.stringify({
          pollId: voteData.pollId,
          optionId: voteData.optionId,
          userId: voteData.userId,
          timestamp: new Date().toISOString(),
        }),
      };

      await this.producer.send({
        topic: this.topic,
        messages: [message],
      });

      console.log("Vote message sent successfully:", message);
    } catch (error) {
      console.error("Error sending vote message:", error);
      throw new AppError("Failed to process vote. Please try again.", 503);
    }
  }

  async sendBatch(messages) {
    try {
      await this.producer.sendBatch({
        topicMessages: [
          {
            topic: this.topic,
            messages: messages.map((msg) => ({
              key: String(msg.pollId),
              value: JSON.stringify(msg),
            })),
          },
        ],
      });

      console.log("Batch messages sent successfully");
    } catch (error) {
      console.error("Error sending batch messages:", error);
      throw new AppError("Failed to process batch messages", 503);
    }
  }
}
