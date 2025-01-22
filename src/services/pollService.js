import { PollRepository } from "../repositories/pollRepository.js";
import { PollProducer } from "../producers/pollProducer.js";
import { AppError } from "../utils/error.js";

export class PollService {
  constructor() {
    this.pollRepository = new PollRepository();
    this.producer = new PollProducer();
  }

  async createPoll(pollData) {
    try {
      const { userId, question, options, expiresAt } = pollData;

      if (!userId) {
        throw new AppError("userId is required", 400);
      }

      if (!question || !options || options.length < 2) {
        throw new AppError(
          "Poll must have a question and at least 2 options",
          400
        );
      }

      const poll = await this.pollRepository.create({
        userId,
        question,
        expiresAt: new Date(expiresAt),
        options,
      });

      return poll;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 400);
    }
  }

  async vote(pollId, optionId, userId) {
    try {
      const poll = await this.pollRepository.findById(pollId);

      if (!poll) {
        throw new AppError("Poll not found", 404);
      }

      if (!poll.active) {
        throw new AppError("Poll is not active", 400);
      }

      if (poll.userId === userId) {
        throw new AppError("Cannot vote on your own poll", 400);
      }

      if (new Date() > poll.expiresAt) {
        throw new AppError("Poll has expired", 400);
      }

      // Send vote to Kafka
      const voteData = {
        pollId,
        optionId,
        userId,
        timestamp: new Date().toISOString(),
      };

      await this.producer.sendVote(voteData);

      return { success: true, message: "Vote registered successfully" };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, error.statusCode || 400);
    }
  }

  async getPollResults(pollId, userId) {
    try {
      const poll = await this.pollRepository.findByIdAndUserId(pollId, userId);

      if (!poll) {
        throw new AppError("Poll not found or unauthorized", 404);
      }

      const totalVotes = poll.options.reduce(
        (sum, option) => sum + option.voteCount,
        0
      );

      return {
        ...poll,
        totalVotes,
        options: poll.options.map((option) => ({
          ...option,
          percentage:
            totalVotes > 0
              ? ((option.voteCount / totalVotes) * 100).toFixed(2)
              : "0.00",
        })),
      };
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 400);
    }
  }

  async getTopPolls() {
    try {
      const polls = await this.pollRepository.findTopPolls();

      return polls.map((poll) => {
        return {
          id: poll.id,
          userId: poll.userId,
          question: poll.question,
          totalVoteCount: poll.totalVoteCount,
          active: poll.active,
          expiresAt: poll.expiresAt,
          createdAt: poll.createdAt,
          options: poll.options.map((option) => ({
            id: option.id,
            text: option.text,
            voteCount: option.voteCount,
            percentage:
              poll.totalVoteCount > 0
                ? ((option.voteCount / poll.totalVoteCount) * 100).toFixed(2)
                : "0.00",
          })),
        };
      });
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 400);
    }
  }
}
