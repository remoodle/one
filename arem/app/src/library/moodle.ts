import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { load as loadHtml, type CheerioAPI } from "cheerio";
import type { FunctionDefinition } from "moodle-api";
import { z } from "zod";
import { config } from "../config";
import type { MoodleAssignment, MoodleGrade } from "../types";
import { MoodleClient, MoodleAPIError } from "./moodleClient";
import { db } from "./db";

interface Options {
  moodleUserId?: number;
  moodleAuthCookies?: MoodleAuthCookie[];
  moodleSessionCookie?: string;
  moodleSessionKey?: string;
}

interface MoodleAuthCookie {
  // TODO: move to shared types
  name: string;
  value: string;
}

function validateForwardedHttpResponseStatus(status: number) {
  return status >= 200 && status < 400;
}

interface MoodleStudentInfo {
  fullname: string;
  username: string; // email
  userId: number;
}

const ignoreGradeNames = new Set([
  "Register(not to edit)",
  "Register(not to edit) total",
]);

interface GradeBaseData {
  itemtype: string;
  itemmodule: string | null;
  idnumber?: string;
}

const gradeNamesToBaseData: Record<string, GradeBaseData> = {
  "Register Midterm": {
    itemtype: "manual",
    itemmodule: null,
    idnumber: "register_midterm",
  },
  "Register Endterm": {
    itemtype: "manual",
    itemmodule: null,
    idnumber: "register_endterm",
  },
  "Register Term": {
    itemtype: "manual",
    itemmodule: null,
    idnumber: "register_term",
  },
  "Register Final": {
    itemtype: "manual",
    itemmodule: null,
    idnumber: "register_final",
  },
  Attendance: {
    itemtype: "mod",
    itemmodule: "attendance",
    idnumber: "register_attendance",
  },
};

const defaultGradeBaseData: GradeBaseData = {
  itemtype: "mod",
  itemmodule: "assign",
};

const msOnlineProxyFixedUrl = config.moodle.msOnlineProxyUrl
  ? new URL(config.moodle.msOnlineProxyUrl).toString()
  : null;

export class Moodle {
  protected httpClient?: AxiosInstance;
  protected moodleClient?: MoodleClient;
  protected moodleUserId?: number;
  protected moodleAuthCookies?: MoodleAuthCookie[];
  protected moodleSessionCookie?: string;
  protected moodleSessionKey?: string;

  constructor(options: Options = {}) {
    this.moodleUserId = options.moodleUserId;
    this.moodleAuthCookies = options.moodleAuthCookies;
    this.moodleSessionCookie = options.moodleSessionCookie;
    this.moodleSessionKey = options.moodleSessionKey;
  }

  static zCourseType = z.enum(["inprogress", "past", "future"]);

  private _createHttpSession() {
    const jar = new CookieJar();

    const httpClient = wrapper(
      axios.create({
        jar,
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: validateForwardedHttpResponseStatus,
        headers: {
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Sec-GPC": "1",
          "Upgrade-Insecure-Requests": "1",
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
        },
      }),
    );

    return { httpClient, jar };
  }

  private async _getFormAndData(url: string) {
    const { httpClient } = this._createHttpSession();

    const respSrc = await httpClient.get(url);
    if (
      !(
        respSrc.status >= 300 &&
        respSrc.status < 400 &&
        respSrc.headers.location
      )
    ) {
      throw new Error(`Expected redirect from ${url}, got ${respSrc.status}`);
    }

    const redirectUrl = new URL(
      respSrc.headers.location,
      respSrc.config.url ?? url,
    );
    const cookieHeader = this.moodleAuthCookies!.map(
      (c) => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`,
    ).join("; ");

    let msOnlineUrl: URL;
    let resp: AxiosResponse;

    if (msOnlineProxyFixedUrl) {
      msOnlineUrl = new URL(msOnlineProxyFixedUrl);
      msOnlineUrl.pathname = redirectUrl.pathname;
      msOnlineUrl.search = redirectUrl.search;

      resp = await httpClient.get(msOnlineUrl.toString(), {
        headers: {
          Host: redirectUrl.host,
          Cookie: cookieHeader,
        },
      });
    } else {
      msOnlineUrl = redirectUrl;

      resp = await httpClient.get(msOnlineUrl.toString(), {
        headers: {
          Cookie: cookieHeader,
        },
      });
    }

    console.log(`GET ${msOnlineUrl.toString()} -> ${resp.status}`);

    const $ = loadHtml(resp.data);
    const $form = $("form").first();
    if ($form.length === 0) {
      throw new Error("No (form) found on page");
    }

    const actionAttr = $form.attr("action") ?? "";
    const baseUrl = resp.config.url ?? url;
    const moodlePostUrl = new URL(actionAttr || ".", baseUrl).toString();

    const moodlePostData: Record<string, string> = {};

    $form.find("input[name]").each((_: any, el: any) => {
      const name = $(el).attr("name")!;
      const value = $(el).attr("value") ?? "";
      const type = ($(el).attr("type") || "").toLowerCase();
      const checked = $(el).is(":checked");
      if (type === "checkbox" || type === "radio") {
        if (checked) {
          moodlePostData[name] = value;
        }
      } else {
        moodlePostData[name] = value;
      }
    });

    $form.find("select[name]").each((_: any, el: any) => {
      const name = $(el).attr("name")!;
      const $options = $(el).find("option");
      const $selected = $options.filter("[selected]").first();
      moodlePostData[name] = $selected.length
        ? ($selected.attr("value") ?? "")
        : ($options.first().attr("value") ?? "");
    });

    $form.find("textarea[name]").each((_: any, el: any) => {
      const name = $(el).attr("name")!;
      moodlePostData[name] = $(el).text() ?? "";
    });

    return { httpClient, moodlePostUrl, moodlePostData };
  }

  private _parseMoodlePageConfigFromHtml(html: string | CheerioAPI): any {
    const $ = typeof html === "string" ? loadHtml(html) : html;

    const scriptTag = $("script")
      .toArray()
      .find((el) => $(el).text().includes('"wwwroot"'));

    if (!scriptTag) {
      throw new Error('No (script) tag with "wwwroot" found');
    }

    const scriptText = $(scriptTag).text();

    const start = scriptText.indexOf('"wwwroot"') - 1;
    if (start < 0) {
      throw new Error('"wwwroot" not found in script text');
    }

    const end = scriptText.indexOf(";", start);
    if (end < 0) {
      throw new Error("Could not find trailing semicolon");
    }

    return JSON.parse(scriptText.slice(start, end));
  }

  async authByCookies() {
    if (!this.moodleAuthCookies) {
      throw new Error("No auth cookies provided");
    }

    const { httpClient, moodlePostUrl, moodlePostData } =
      await this._getFormAndData(`${config.moodle.url}/auth/oidc/`);

    this.httpClient = httpClient;

    console.log(
      `Posting to ${moodlePostUrl} with data: ${JSON.stringify(moodlePostData)}`,
    );
    const resp = await httpClient.post(
      moodlePostUrl,
      new URLSearchParams(moodlePostData),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxRedirects: 0,
        validateStatus: validateForwardedHttpResponseStatus,
      },
    );

    if (
      !(
        validateForwardedHttpResponseStatus(resp.status) &&
        resp.headers.location
      )
    ) {
      throw new Error("Unexpected response during cookie auth");
    }

    const resp2 = await httpClient.get(
      new URL(resp.headers.location, moodlePostUrl).toString(),
      { maxRedirects: 0 },
    );

    const pageJsonData = this._parseMoodlePageConfigFromHtml(resp2.data);

    const userId = pageJsonData.userId as number;
    const moodleSessionKey = pageJsonData.sesskey as string;

    if (userId === 0) {
      throw new Error("Authentication failed, userId is invalid");
    }

    const setCookieHeaders = resp.headers["set-cookie"];
    if (!setCookieHeaders || !Array.isArray(setCookieHeaders)) {
      throw new Error("No set-cookie headers found");
    }

    const moodleSessionCookieRaw = setCookieHeaders
      .map((c) => c.split(";")[0])
      .find((c) => c.startsWith("MoodleSession="));

    if (!moodleSessionCookieRaw) {
      throw new Error("MoodleSession cookie not found");
    }

    const moodleSessionCookie = moodleSessionCookieRaw.split("=")[1];

    console.log(
      `Authenticated as userId=${userId}, sesskey=${moodleSessionKey}, MoodleSession=${moodleSessionCookie}`,
    );
    this.moodleUserId = userId;
    this.moodleSessionCookie = moodleSessionCookie;
    this.moodleSessionKey = moodleSessionKey;

    return { userId, moodleSessionCookie, moodleSessionKey };
  }

  private _getHttpClient(): AxiosInstance {
    if (!this.httpClient) {
      this.httpClient = this._createHttpSession().httpClient;
    }
    return this.httpClient;
  }

  private setMoodleCookies(httpClient: AxiosInstance) {
    if (!this.moodleSessionCookie) {
      throw new Error("No MoodleSession cookie available");
    }

    httpClient.defaults.headers.Cookie = `MoodleSession=${encodeURIComponent(
      this.moodleSessionCookie,
    )}`;
  }

  async getStudentInfo(): Promise<MoodleStudentInfo> {
    const httpClient = this._getHttpClient();
    this.setMoodleCookies(httpClient);

    const resp = await httpClient.get(`${config.moodle.url}/user/profile.php`);

    const $ = loadHtml(resp.data);
    const fullname = $("h1").first().text().trim();
    const username = decodeURIComponent(
      $("a[href^='mailto']").attr("href")!,
    ).replace(/^mailto:/i, "");

    const pageJsonData = this._parseMoodlePageConfigFromHtml($);

    const userId = pageJsonData.userId as number;

    return { fullname, username, userId };
  }

  async getGrades({
    courseId,
  }: {
    courseId: number | string;
  }): Promise<MoodleGrade[]> {
    if (!this.moodleUserId) {
      throw new Error("No Moodle user ID available, please authenticate first");
    }

    const httpClient = this._getHttpClient();
    this.setMoodleCookies(httpClient);

    const resp = await httpClient.get(
      `${config.moodle.url}/course/user.php?mode=grade&id=${courseId}&user=${this.moodleUserId}`,
    );

    const $ = loadHtml(resp.data);

    const $gradeEls = $(
      $("table.generaltable tr[data-hidden='false']")
        .toArray()
        .slice(1)
        .slice(0, -1)
        .slice(0, -1),
    );

    const grades: MoodleGrade[] = $gradeEls
      .map((_, el) => {
        const $gradeEl = $(el);
        if ($gradeEl.hasClass("spacer")) {
          return null;
        }

        const $nameAndIdEl = $(".gradeitemheader", $gradeEl).first();
        if (!$nameAndIdEl.length) {
          return null;
        }
        const name = $nameAndIdEl.text().trim();
        if (ignoreGradeNames.has(name)) {
          return null;
        }

        const gradeId = parseInt(
          $("th.item", $gradeEl).first().attr("id")!.split("_", 3)[1],
        );
        const gradeAssignmentId =
          parseInt($nameAndIdEl.attr("href")?.split("id=", 2)?.[1] || "") ??
          undefined;

        const gradeValueFormatted = $("td.column-percentage", $gradeEl)
          .first()
          .text()
          .replace(" %", "")
          .replace("-", "")
          .trim();
        const gradeValueRaw =
          parseFloat($("td.column-grade", $gradeEl).first().text().trim()) ??
          null;
        const gradeValueRange = $("td.column-range", $gradeEl)
          .first()
          .text()
          .trim()
          .split("–", 2);
        const gradeValueMin = parseFloat(gradeValueRange[0]);
        const gradeValueMax = parseFloat(gradeValueRange[1]);

        const gradeBaseData =
          gradeNamesToBaseData[name] ?? defaultGradeBaseData;

        return {
          id: gradeId,
          itemname: name,
          itemtype: gradeBaseData.itemtype,
          itemmodule: gradeBaseData.itemmodule ?? undefined,
          iteminstance: gradeAssignmentId,
          graderaw: gradeValueRaw,
          gradeformatted: gradeValueFormatted,
          grademin: gradeValueMin,
          grademax: gradeValueMax,
          // cmid: -1,  // TODO: review usage with assignments rewriting
        };
      })
      .get();

    return grades.filter((g): g is MoodleGrade => g !== null);
  }

  async getAssignments({
    courseId,
  }: {
    courseId: number | string;
  }): Promise<MoodleAssignment[]> {
    if (!this.moodleUserId) {
      throw new Error("No Moodle user ID available, please authenticate first");
    }

    const [response, error] = await this.call("core_get_fragment", {
      component: "core_course",
      callback: "course_overview",
      contextid: 1,
      args: [
        {
          name: "courseid",
          value: `${courseId}`,
        },
        {
          name: "modname",
          value: "assign",
        },
      ],
    });

    if (error) {
      throw new Error(
        `Moodle API error: ${error.message} (code: ${error.code})`,
      );
    }

    const $ = loadHtml(response.html!);

    const assignments: MoodleAssignment[] = $(
      "table.course-overview-table tbody tr",
    )
      .map((_, el) => {
        const $assignmentEl = $(el);
        const cmId = parseInt(
          $assignmentEl.attr("data-mdl-overview-cmid") ?? "",
          10,
        );

        if (!cmId) {
          return null;
        }

        const $nameAndIdEl = $assignmentEl.find(
          'td[data-mdl-overview-item="name"]',
        );
        const assignmentId = parseInt(
          $nameAndIdEl
            .find(".fw-bold .activityname")
            .first()
            .attr("href")
            ?.split("id=", 2)?.[1] ?? "",
          10,
        );
        const name = $nameAndIdEl.attr("data-mdl-overview-value")!.trim();

        if (!assignmentId) {
          console.log("Skipping assignment with invalid ID");
          return null;
        }

        const dueDateTsStr = (
          $assignmentEl
            .find('td[data-mdl-overview-item="duedate"]')
            .attr("data-mdl-overview-value") || ""
        ).trim();
        const dueDateTs =
          dueDateTsStr && /^\d+$/.test(dueDateTsStr)
            ? parseInt(dueDateTsStr, 10)
            : 0;

        const gradeValueRawAttr = (
          $assignmentEl
            .find('td[data-mdl-overview-item="Grade"]')
            .attr("data-mdl-overview-value") || ""
        )
          .trim()
          .replace("-", "");
        const gradeValueRaw = parseFloat(gradeValueRawAttr) ?? null;

        return {
          id: assignmentId,
          cmid: cmId,
          course:
            typeof courseId === "number" ? courseId : parseInt(courseId, 10),
          name,
          duedate: dueDateTs,
          grade: gradeValueRaw,
        };
      })
      .get();

    return assignments.filter((a): a is MoodleAssignment => a !== null);
  }

  async call<F extends keyof FunctionDefinition | (string & {})>(
    func: F,
    ...params: F extends keyof FunctionDefinition
      ? [FunctionDefinition[F][0]] | []
      : [Record<string, unknown>]
  ): Promise<
    | [
        F extends keyof FunctionDefinition ? FunctionDefinition[F][1] : unknown,
        null,
      ]
    | [null, { message: string; code: string | null }]
  > {
    if (!this.moodleClient) {
      if (!this.moodleUserId) {
        throw new Error(
          "No Moodle user ID available, please authenticate first",
        );
      }

      if (!this.moodleSessionCookie || !this.moodleSessionKey) {
        throw new Error(
          "No Moodle client or session available, please authenticate first",
        );
      }

      this.moodleClient = new MoodleClient(
        config.moodle.url,
        this.moodleSessionCookie,
        this.moodleSessionKey,
      );
    }

    try {
      const res = await this.moodleClient.call(
        func,
        ...(params as F extends keyof FunctionDefinition
          ? Record<never, never> extends FunctionDefinition[F][0]
            ? []
            : [FunctionDefinition[F][0]]
          : [Record<string, unknown>]),
      );

      return [
        res as F extends keyof FunctionDefinition
          ? FunctionDefinition[F][1]
          : unknown,
        null,
      ];
    } catch (err: MoodleAPIError | any) {
      if (err?.code === "servicerequireslogin") {
        // attempting reauth using Moodle OIDC and authCookies
        // TODO: use user.health
        try {
          await this.authByCookies();
        } catch (reauthErr: any) {
          return [null, { message: (reauthErr as Error).message, code: null }];
        }

        // TODO: log reauth success and MoodleSession change

        try {
          await db.user.updateOne(
            { moodleId: this.moodleUserId },
            {
              $set: {
                moodleSessionCookie: this.moodleSessionCookie,
                moodleSessionKey: this.moodleSessionKey,
              },
            },
          );
        } catch (dbErr: any) {
          // TODO: log db update error
        }

        this.moodleClient = new MoodleClient(
          config.moodle.url,
          this.moodleSessionCookie!,
          this.moodleSessionKey!,
        );

        return await this.call(func, ...params);
      }

      return [null, { message: err.message, code: err?.code }];
    }
  }
}
