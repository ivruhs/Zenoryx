// lib/apiClient.js

/**
 * This file is the single gateway between our next.js frontend and express backend.
 * instead of writing fetch calls everywhere directly in our components, we have created one reusable apiClient. Every request will go through this file.
 * We are exporting apiClient object inside which we have 4 methods
 * request(), get(), post() and delete(). request() is the main method which will be used by get(), post() and delete() methods.
 *
 * The request() method constructs the url, attaches the necessary headers, credentials = include since we need to sent our session cookie with every request. Also suppose we are sending some body, it might be json/object. but our backend expects stringified json, so we are stringifying the body if it is not already a string. Then we are making the fetch call and waiting for the response. If the response is not ok, we are throwing an error with status and error message. If the response is ok, we are returning the data.
 *
 * get,post,delete are ultimately calling the request method to handle all the logic
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      ...options,
      // Critical : this ensures our HttpOnly session cookie is sent with every request to the Express server.
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };
    if (options.body && typeof options.body !== "string") {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, config);
    let data;
    try {
      data = await response.json();
    } catch {
      data = { error: "An unexpected network error occurred." };
    }
    if (!response.ok) {
      throw { status: response.status, ...data };
    }
    return data;
  },

  get(endpoint, options) {
    return this.request(endpoint, { method: "GET", ...options });
  },
  post(endpoint, body, options) {
    return this.request(endpoint, { method: "POST", body, ...options });
  },
  delete(endpoint, options) {
    return this.request(endpoint, { method: "DELETE", ...options });
  },
};
