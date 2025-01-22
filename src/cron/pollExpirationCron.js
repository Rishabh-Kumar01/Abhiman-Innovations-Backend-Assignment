import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/error.js";

class PollExpirationCron {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async deactivateExpiredPolls() {
    try {
      const currentDate = new Date();

      const updatedPolls = await this.prisma.poll.updateMany({
        where: {
          active: true,
          expiresAt: {
            lt: currentDate,
          },
        },
        data: {
          active: false,
        },
      });

      console.log(
        `Deactivated ${updatedPolls.count} expired polls at ${currentDate}`
      );
    } catch (error) {
      console.error("Error in poll deactivation cron:", error);
    }
  }

  // Run every hour
  startCron() {
    cron.schedule("* * * * *", async () => {
      await this.deactivateExpiredPolls();
    });
  }
}

export default new PollExpirationCron();
