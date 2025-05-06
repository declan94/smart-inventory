const defaultRespHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
};

export const response = (status: number, data: any, headers?: {[k: string]: string}) => {
  return {
    statusCode: status,
    headers: {
      ...defaultRespHeaders,
     ...headers,
    },
    body: JSON.stringify(data),
  };
};

export const errorResponse = (message: string, status?: number) => {
  return response(status || 500, {
    error: message,
  });
}

export const okResponse = (data: any) => {
  return response(200, data);
}
