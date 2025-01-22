import express from "express";
import { PollController } from "../controllers/pollController.js";

const router = express.Router();
const pollController = new PollController();

router.post("/", pollController.createPoll);
router.post("/:pollId/vote", pollController.vote);
router.get("/:pollId/results", pollController.getPollResults);
router.get("/top", pollController.getTopPolls);

export default router;
