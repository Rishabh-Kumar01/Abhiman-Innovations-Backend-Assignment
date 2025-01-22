import { PollConsumer } from "./pollConsumer.js";

export async function startConsumers() {
  try {
    const pollConsumer = new PollConsumer();
    await pollConsumer.startConsumer();

    // Handle graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("SIGTERM signal received. Shutting down consumers...");
      await pollConsumer.stopConsumer();
    });

    process.on("SIGINT", async () => {
      console.log("SIGINT signal received. Shutting down consumers...");
      await pollConsumer.stopConsumer();
    });
  } catch (error) {
    console.error("Failed to start consumers:", error);
    throw error;
  }
}
