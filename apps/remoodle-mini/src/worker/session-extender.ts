import { db } from "../db";
import { MoodleClient } from "../library/moodle/client";
import { logger } from "../logger";

export class SessionExtender {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly intervalMs: number = 5 * 60 * 1000; // 5 minutes

  start(): void {
    if (this.intervalId) {
      logger.worker.warn({ msg: "Session extender is already running" });
      return;
    }

    logger.worker.info({ msg: "Starting session extender" });

    this.intervalId = setInterval(async () => {
      await this.extendAllSessions();
    }, this.intervalMs);

    // Run immediately on start
    this.extendAllSessions();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.worker.info({ msg: "Session extender stopped" });
    }
  }

  private async extendAllSessions(): Promise<void> {
    try {
      const users = await db.mongoDataSource.manager.find(db.User, {
        where: { moodleToken: { $ne: null } },
      });

      logger.worker.info({
        msg: "Extending sessions",
        userCount: users.length,
      });

      const results = await Promise.allSettled(
        users.map((user) => this.extendUserSession(user)),
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      logger.worker.info({
        msg: "Session extension completed",
        successful,
        failed,
      });

      // Log failed sessions for debugging
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          logger.worker.error({
            msg: "Failed to extend session",
            userId: users[index].id,
            error: result.reason.message,
          });
        }
      });
    } catch (error) {
      logger.worker.error({
        msg: "Failed to extend sessions",
        error: error.message,
        stack: error.stack,
      });
    }
  }

  private async extendUserSession(user: any): Promise<void> {
    try {
      const moodleClient = new MoodleClient(
        "https://lms.astanait.edu.kz",
        user.moodleToken,
      );

      // Try to extend the session by making a simple API call
      const success = await moodleClient.extendSession();

      if (!success) {
        logger.worker.warn({
          msg: "Session extension failed for user",
          userId: user.id,
          moodleId: user.moodleId,
        });

        // Optionally, you could mark the user's session as invalid
        // or notify them via Telegram that they need to re-authenticate
      } else {
        logger.worker.debug({
          msg: "Session extended successfully",
          userId: user.id,
          moodleId: user.moodleId,
        });
      }
    } catch (error) {
      logger.worker.error({
        msg: "Error extending session for user",
        userId: user.id,
        moodleId: user.moodleId,
        error: error.message,
      });
      throw error;
    }
  }

  async extendUserSessionById(userId: string): Promise<boolean> {
    try {
      const user = await db.mongoDataSource.manager.findOne(db.User, {
        where: { id: userId },
      });

      if (!user || !user.moodleToken) {
        logger.worker.warn({
          msg: "User not found or no moodle token",
          userId,
        });
        return false;
      }

      await this.extendUserSession(user);
      return true;
    } catch (error) {
      logger.worker.error({
        msg: "Failed to extend session for specific user",
        userId,
        error: error.message,
      });
      return false;
    }
  }
}
