import express from "express";
import { PollController } from "../controllers/pollController.js";

const router = express.Router();
const pollController = new PollController();

router.get("/", pollController.getTopPolls);

export default router;
