/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018-2022 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import "monaco-editor/esm/vs/editor/editor.all.js";

// support all editor features
import "monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp.js";
import "monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js";
import "monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneHelpQuickAccess.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickInput/standaloneQuickInputService.js";
import "monaco-editor/esm/vs/editor/standalone/browser/referenceSearch/standaloneReferenceSearch.js";
import "monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast.js";

import * as monacoEditor from "monaco-editor";

import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import normalizeUrl from "normalize-url";
import {
  toSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from "vscode-ws-jsonrpc";
import { buildWorkerDefinition } from "monaco-editor-workers";

import {
  MonacoLanguageClient,
  CloseAction,
  ErrorAction,
  MonacoServices,
  MessageTransports,
} from "monaco-languageclient";
import { StandaloneServices } from "vscode/services";
import getMessageServiceOverride from "vscode/service-override/messages";
import { codeExecuter } from "./CodeExecuter";
import Debugger from "./debuger/debugger";

type P = unknown;
type S = {
  output: string;
};

function createUrl(hostname: string, port: number, path: string): string {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return normalizeUrl(`${protocol}://${hostname}:${port}${path}`);
}

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

const value = `
print("hello world")
print("write codes w")

`;

const editorFileUri = monacoEditor.Uri.parse("inmemory://temp.python");
const editorModel = monacoEditor.editor.createModel(
  value,
  "python",
  editorFileUri
);

const printerModel = monacoEditor.editor.createModel(
  "",
  "plaintext",
  monacoEditor.Uri.parse("inmemory://temp.txt")
);

const menuBarHeight = 110;
const printerWidth = 400;

class App extends React.Component<P, S> {
  private readonly width: number;
  private readonly height: number;
  private editor: monacoEditor.editor.IStandaloneCodeEditor | undefined;
  private printer: monacoEditor.editor.IStandaloneCodeEditor | undefined;
  private url = createUrl("localhost", 5000, "/");
  private webSocket = new WebSocket(this.url);
  private languageClient: MonacoLanguageClient | undefined;
  private transports: MessageTransports | undefined;
  private code: string = "";
  private debugger: Debugger | undefined;

  constructor(props: P) {
    super(props);
    this.state = {
      output: "",
    };
    this.width = window.innerWidth - printerWidth;
    this.height = window.innerHeight - menuBarHeight;
    this.onChange = this.onChange.bind(this);
  }

  onChange(event: monacoEditor.editor.IModelContentChangedEvent) {
    console.log("onChange", event);
    this.code = editorModel.getValue();
  }

  componentDidMount() {
    console.log("this.webSocket", this.webSocket);

    this.webSocket.onopen = (ev: Event) => {
      console.log("ws on::onopen:", ev);
      const socket = toSocket(this.webSocket);
      const reader = new WebSocketMessageReader(socket);
      const writer = new WebSocketMessageWriter(socket);

      const transports = {
        reader: reader,
        writer: writer,
      };
      this.transports = transports;
      console.log("this.reader", reader);
      console.log("this.writer", writer);
      const languageClient = new MonacoLanguageClient({
        name: "pylsp",
        clientOptions: {
          documentSelector: ["python"],
          errorHandler: {
            error: () => ({ action: ErrorAction.Continue }),
            closed: () => ({ action: CloseAction.DoNotRestart }),
          },
          middleware: {
            workspace: {
              configuration: (params, token, next) => {
                if (params.items.find((x) => x.section === "python")) {
                  return [
                    {
                      analysis: {
                        stubPath: "stubs",
                        useLibraryCodeForTypes: true,
                        autoImportCompletions: true,
                        typeCheckingMode: "basic",
                      },
                    },
                  ];
                }
                if (params.items.find((x) => x.section === "python.analysis")) {
                  return [
                    {
                      stubPath: "stubs",
                      useLibraryCodeForTypes: true,
                      autoImportCompletions: true,
                      typeCheckingMode: "basic",
                    },
                  ];
                }
                return next(params, token);
              },
            },
          },
        },
        connectionProvider: {
          get: (encoding: string) => {
            return Promise.resolve(transports);
          },
        },
      });
      languageClient
        .start()
        .catch((res) => {
          console.log(res);
        })
        .finally(() => {
          console.log(languageClient.diagnostics);
        });
      reader.onClose(() => languageClient.stop());
      this.languageClient = languageClient;
    };
    this.webSocket.onerror = (ev: Event) => {
      console.log("ws on::onerror:", ev);
    };
    this.webSocket.onmessage = (ev: MessageEvent) => {
      console.log("ws on::onmessage:", ev);
    };
    this.webSocket.onclose = (ev: CloseEvent) => {
      console.log("ws on::onclose:", ev);
    };

    this.editor = monacoEditor.editor.create(
      document.getElementById("editor")!,
      {
        model: editorModel,
        glyphMargin: true,
        lightbulb: {
          enabled: true,
        },
        theme: "vs-dark",
        language: "python",
        selectOnLineNumbers: true,
      }
    );
    MonacoServices.install();
    editorModel.onDidChangeContent((_event) => {
      this.onChange(_event);
    });
    this.printer = monacoEditor.editor.create(
      document.getElementById("printer")!,
      {
        model: printerModel,
        glyphMargin: true,
        lightbulb: {
          enabled: true,
        },
        theme: "vs-dark",
        language: "plaintext",
        selectOnLineNumbers: true,
        readOnly: true,
      }
    );
    console.log("this.editor", this.editor);

    setTimeout(() => {
      this.debugger = new Debugger(
        editorModel as any,
        document.getElementById("editor") as any,
        {
          currentFile: {
            path: editorFileUri.path,
            // file: "temp.python",
          },
          debugArguments: {},
          language: "python",
        }
      );
    }, 3000);
  }

  componentWillUnmount() {
    this.webSocket.close();
  }

  render() {
    return <p>dd</p>;
    return (
      <Stack direction={"column"} sx={{ height: "100vh" }}>
        <Stack
          direction={"row"}
          sx={{ px: 5, pt: 2, alignItems: "center", height: menuBarHeight - 5 }}
        >
          <Button
            variant={"contained"}
            size={"large"}
            onClick={() => {
              codeExecuter.executeCode(editorModel.getValue()).then((res) => {
                // this.setState({
                //   output: res.data.stdout,
                // });
                printerModel.setValue(res.data.stdout);
              });
            }}
          >
            Run iiiiiii
          </Button>
        </Stack>
        <Stack
          direction={"row"}
          sx={{
            alignItems: "flex-start",
            justifyContent: "center",
            width: "100%",
            px: "2px",
            pb: "2px",
          }}
        >
          <Box
            id={"editor"}
            sx={{
              width: this.width,
              height: this.height - 300,
              backgroundColor: "#051b30",
              pr: 1,
            }}
          />
          <Box
            id={"printer"}
            sx={{
              width: printerWidth,
              height: this.height,
              backgroundColor: "#051b30",
            }}
          />
        </Stack>
      </Stack>
    );
  }
}

export default App;
