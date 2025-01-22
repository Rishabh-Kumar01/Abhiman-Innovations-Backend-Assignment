import { PollService } from "../services/pollService.js";
import { AppError } from "../utils/error.js";

export class PollController {
  constructor() {
    this.pollService = new PollService();
  }

  createPoll = async (req, res, next) => {
    try {
      const poll = await this.pollService.createPoll(req.body);
      res.status(201).json({
        status: "success",
        data: poll,
      });
    } catch (error) {
      next(error);
    }
  };

  vote = async (req, res, next) => {
    try {
      const { pollId } = req.params;
      const { userId, optionId } = req.body;

      console.log(pollId, userId, optionId);

      if (!userId || !optionId) {
        throw new AppError("userId and optionId are required", 400);
      }

      const result = await this.pollService.vote(
        parseInt(pollId),
        parseInt(optionId),
        parseInt(userId)
      );

      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getPollResults = async (req, res, next) => {
    try {
      const { pollId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        throw new AppError("userId is required", 400);
      }

      const results = await this.pollService.getPollResults(
        parseInt(pollId),
        parseInt(userId)
      );
      res.status(200).json({
        status: "success",
        data: results,
      });
    } catch (error) {
      next(error);
    }
  };

  getTopPolls = async (req, res, next) => {
    try {
      const polls = await this.pollService.getTopPolls();
      res.status(200).json({
        status: "success",
        data: polls,
      });
    } catch (error) {
      next(error);
    }
  };
}
