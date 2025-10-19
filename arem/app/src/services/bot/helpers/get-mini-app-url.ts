import { getAuthHeaders, request } from "./hc";

export const getMiniAppUrl = async (
  userId: number,
  host: string,
  route: string = "",
) => {
  const [data, error] = await request((client) => {
    return client.v2.auth.login.$post(
      { json: {} },
      { headers: getAuthHeaders(userId) },
    );
  });

  if (error) {
    return host + route;
  }

  const b64 = btoa(JSON.stringify(data));
  const url = host + route + "?usr=" + b64;

  return url;
};
