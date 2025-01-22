import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/error.js";

export class PollRepository {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data) {
    try {
      return await this.prisma.poll.create({
        data: {
          userId: data.userId,
          question: data.question,
          expiresAt: data.expiresAt,
          options: {
            create: data.options.map((text) => ({ text })),
          },
        },
        include: {
          options: true,
        },
      });
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  }

  async findById(pollId) {
    try {
      return await this.prisma.poll.findUnique({
        where: { id: pollId },
        include: {
          options: true,
        },
      });
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  }

  async findByIdAndUserId(pollId, userId) {
    try {
      return await this.prisma.poll.findFirst({
        where: {
          id: pollId,
          userId: userId,
        },
        include: {
          options: true,
        },
      });
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  }

  async createVote(pollId, optionId, userId) {
    try {
      const [vote] = await this.prisma.$transaction([
        // Create vote record
        this.prisma.vote.create({
          data: {
            pollId,
            pollOptionId: optionId,
            userId,
          },
        }),
        // Increment vote count in PollOption
        this.prisma.pollOption.update({
          where: { id: optionId },
          data: {
            voteCount: {
              increment: 1,
            },
          },
        }),
        // Increment totalVoteCount in Poll
        this.prisma.poll.update({
          where: { id: pollId },
          data: {
            totalVoteCount: {
              increment: 1,
            },
          },
        }),
      ]);
      return vote;
    } catch (error) {
      if (error.code === "P2002") {
        throw new AppError("You have already voted on this poll", 400);
      }
      throw new AppError(error.message, 400);
    }
  }

  async findTopPolls() {
    try {
      return await this.prisma.poll.findMany({
        where: {
          active: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          options: {
            select: {
              id: true,
              text: true,
              voteCount: true,
            },
          },
        },
        orderBy: {
          totalVoteCount: "desc", // Order by totalVoteCount in descending order
        },
        take: 10, // Limit to top 10
      });
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  }
}
