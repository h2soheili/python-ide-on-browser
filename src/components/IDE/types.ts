export interface Status {
  id: number;
  description: string;
}

export interface SubmissionResult {
  stdout: string; //code output
  time: string;
  memory: number;
  stderr?: any;
  token: string;
  compile_output?: any;
  message?: any;
  status: Status;
}
