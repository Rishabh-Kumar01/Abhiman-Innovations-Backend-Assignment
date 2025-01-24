import express from "express";
import { PollController } from "../controllers/pollController.js";

const router = express.Router();
const pollController = new PollController();

router.post("/", pollController.createPoll);
router.post("/:pollId/vote", pollController.vote);
router.get("/:pollId", pollController.getPollResults);

export default router;
