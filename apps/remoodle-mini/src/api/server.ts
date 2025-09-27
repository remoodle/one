import { createServer } from "http";
import { parse } from "url";
import { db } from "../db";
import { MoodleClient } from "../library/moodle/client";
import { logger } from "../logger";

interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export class ApiServer {
  private server: any;

  constructor(private port: number = 3001) {
    this.server = createServer(this.handleRequest.bind(this));
  }

  private async handleRequest(req: any, res: any) {
    const parsedUrl = parse(req.url!, true);
    const method = req.method;
    const pathname = parsedUrl.pathname;

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );

    if (method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      let body = "";
      if (method === "POST" || method === "PUT") {
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });

        await new Promise((resolve) => {
          req.on("end", resolve);
        });
      }

      const request: ApiRequest = {
        method,
        url: pathname!,
        headers: req.headers as Record<string, string>,
        body: body ? JSON.parse(body) : undefined,
      };

      const response = await this.routeRequest(request);

      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);
    } catch (error) {
      logger.api.error({ error: error.message, stack: error.stack });
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  private async routeRequest(req: ApiRequest): Promise<ApiResponse> {
    const { method, url, body } = req;

    if (url === "/api/moodle/session" && method === "POST") {
      return this.handleMoodleSession(body);
    }

    if (url === "/api/health" && method === "GET") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
      };
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Not found" }),
    };
  }

  private async handleMoodleSession(body: any): Promise<ApiResponse> {
    try {
      const { moodleSession, userInfo } = body;

      if (!moodleSession) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "MoodleSession cookie is required" }),
        };
      }

      // Create Moodle client to test the session
      const moodleClient = new MoodleClient(
        "https://lms.astanait.edu.kz",
        moodleSession,
      );

      // Test if the session is valid by trying to get user info
      let moodleUser;
      try {
        moodleUser = await moodleClient.getUserInfo();
      } catch (error) {
        return {
          statusCode: 401,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Invalid Moodle session" }),
        };
      }

      // Check if user already exists
      const existingUser = await db.mongoDataSource.manager.findOne(db.User, {
        where: { moodleId: moodleUser.id },
      });

      if (existingUser) {
        // Update existing user
        existingUser.moodleToken = moodleSession;
        existingUser.name = moodleUser.fullname;
        await db.mongoDataSource.manager.save(existingUser);

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "User updated successfully",
            user: {
              id: existingUser.id,
              name: existingUser.name,
              moodleId: existingUser.moodleId,
            },
          }),
        };
      } else {
        // Create new user
        const newUser = new db.User();
        newUser.moodleId = moodleUser.id;
        newUser.moodleToken = moodleSession;
        newUser.name = moodleUser.fullname;
        newUser.telegramId = null; // Will be set when they connect via Telegram
        newUser.notifications = {
          deadlineReminders_telegram: 0,
          gradeUpdates_telegram: 1,
          courseChanges_telegram: 1,
        };
        newUser.deadlineReminders = {
          thresholds: ["PT3H", "PT6H", "P1D"],
        };

        await db.mongoDataSource.manager.save(newUser);

        return {
          statusCode: 201,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "User created successfully",
            user: {
              id: newUser.id,
              name: newUser.name,
              moodleId: newUser.moodleId,
            },
          }),
        };
      }
    } catch (error) {
      logger.api.error({ error: error.message, stack: error.stack });
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Failed to process Moodle session" }),
      };
    }
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        logger.api.info({ msg: `API server running on port ${this.port}` });
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => {
        logger.api.info({ msg: "API server stopped" });
        resolve();
      });
    });
  }
}
