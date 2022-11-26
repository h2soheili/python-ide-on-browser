import axios from "axios";

export const httpClient = axios.create({
  baseURL: process.env.REACT_APP_judge0,
  headers: { "X-Custom-Header": "foobar" },
});
