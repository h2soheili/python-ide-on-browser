import { AxiosInstance, AxiosResponse } from "axios";
import { SubmissionResult } from "./types";
import { httpClient } from "./HttpClient";

class CodeExecuter {
  private readonly httpClient: AxiosInstance;

  constructor(httpClient: AxiosInstance) {
    this.httpClient = httpClient;
  }

  public executeCode(code: string): Promise<AxiosResponse<SubmissionResult>> {
    return this.httpClient.post(
      "/submissions/?base64_encoded=false&wait=true",
      {
        source_code: code,
        language_id: 71, // python 3.8
      }
    );
  }
}

export const codeExecuter = new CodeExecuter(httpClient);
