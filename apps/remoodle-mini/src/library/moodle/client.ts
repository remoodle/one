export interface MoodleEvent {
  id: number;
  name: string;
  description: string;
  timestart: number;
  timeduration: number;
  course: {
    id: number;
    fullname: string;
    shortname: string;
  };
  category: {
    id: number;
    name: string;
  };
  eventtype: string;
  visible: number;
  timemodified: number;
}

export interface MoodleUser {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  email: string;
}

export interface MoodleApiResponse<T = any> {
  error?: boolean;
  data?: T;
  exception?: string;
  errorcode?: string;
}

export class MoodleClient {
  private baseUrl: string;
  private sessionCookie: string;
  private userAgent: string;

  constructor(baseUrl: string, sessionCookie: string) {
    this.baseUrl = baseUrl;
    this.sessionCookie = sessionCookie;
    this.userAgent =
      "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0";
  }

  private async makeRequest<T = any>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: any,
  ): Promise<MoodleApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": this.userAgent,
      Cookie: `MoodleSession=${this.sessionCookie}`,
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Sec-GPC": "1",
      "Upgrade-Insecure-Requests": "1",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Moodle API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data as MoodleApiResponse<T>;
  }

  async getCalendarEvents(): Promise<MoodleEvent[]> {
    const response = await this.makeRequest<MoodleEvent[]>(
      "/lib/ajax/service.php?info=core_calendar_get_action_events_by_timesort",
      "POST",
    );

    if (response.error) {
      throw new Error(
        `Moodle API error: ${response.exception || "Unknown error"}`,
      );
    }

    return response.data || [];
  }

  async getUserInfo(): Promise<MoodleUser> {
    const response = await this.makeRequest<MoodleUser[]>(
      "/lib/ajax/service.php?info=core_user_get_users_by_field",
      "POST",
      {
        field: "id",
        values: [1], // This might need to be adjusted based on how you get the current user ID
      },
    );

    if (response.error) {
      throw new Error(
        `Moodle API error: ${response.exception || "Unknown error"}`,
      );
    }

    return response.data?.[0] as MoodleUser;
  }

  async extendSession(): Promise<boolean> {
    try {
      const response = await this.makeRequest<boolean>(
        "/lib/ajax/service.php?info=core_session_touch",
        "POST",
        [
          {
            index: 0,
            methodname: "core_session_touch",
            args: {},
          },
        ],
      );

      if (response.error) {
        return false;
      }

      return response.data === true;
    } catch (error) {
      return false;
    }
  }

  updateSessionCookie(newCookie: string): void {
    this.sessionCookie = newCookie;
  }
}
