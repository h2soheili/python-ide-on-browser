import normalizeUrl from "normalize-url";
import { buildWorkerDefinition } from "monaco-editor-workers";

import { StandaloneServices } from "vscode/services";
import getMessageServiceOverride from "vscode/service-override/messages";
import * as monacoEditor from "monaco-editor";

export function createUrl(
  hostname: string,
  port: number,
  path: string
): string {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return normalizeUrl(`${protocol}://${hostname}:${port}${path}`);
}

export function prepareEditor() {
  const service = getMessageServiceOverride(document.body);

  StandaloneServices.initialize({
    ...service,
  });

  buildWorkerDefinition("dist", new URL("", window.location.href).href, false);

  monacoEditor.languages.register({
    id: "python",
    extensions: [".py", ".pyc", ".pyw", "pyo", "pyd"],
    aliases: ["python", "py"],
  });

  monacoEditor.languages.register({
    id: "plaintext",
    extensions: [".txt"],
    aliases: ["PLAINTEXT", "plaintext"],
    mimetypes: ["text/plain"],
  });
}
