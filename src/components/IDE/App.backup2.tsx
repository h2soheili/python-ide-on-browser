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

// monacoEditor.languages.register({
//   id: "json",
//   extensions: [
//     ".json",
//     ".bowerrc",
//     ".jshintrc",
//     ".jscsrc",
//     ".eslintrc",
//     ".babelrc",
//   ],
//   aliases: ["JSON", "json"],
//   mimetypes: ["application/json"],
// });

const value = `print("hello world")`;

const model = monacoEditor.editor.createModel(
  value,
  "python",
  monacoEditor.Uri.parse("inmemory://temp.python")
);

const menuBarHeight = 110;

class App extends React.Component<P, S> {
  private readonly width: number;
  private readonly height: number;
  private editor: monacoEditor.editor.IStandaloneCodeEditor | undefined;
  private url = createUrl("localhost", 5000, "/");
  private webSocket = new WebSocket(this.url);
  private languageClient: MonacoLanguageClient | undefined;
  private transports: MessageTransports | undefined;
  private code: string = "";

  constructor(props: P) {
    super(props);
    this.state = {
      output: "",
    };
    this.width = window.innerWidth - 350;
    this.height = window.innerHeight - menuBarHeight;
    this.onChange = this.onChange.bind(this);
  }

  onChange(event: monacoEditor.editor.IModelContentChangedEvent) {
    console.log("onChange", event);
    this.code = model.getValue();
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
        model: model,
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
    model.onDidChangeContent((_event) => {
      this.onChange(_event);
    });
    console.log("this.editor", this.editor);
  }

  componentWillUnmount() {
    this.webSocket.close();
  }

  render() {
    return (
      <Stack direction={"column"}>
        <Stack
          direction={"row"}
          sx={{ p: 4, alignItems: "center", height: menuBarHeight }}
        >
          <Button
            variant={"contained"}
            size={"large"}
            onClick={() => {
              codeExecuter.executeCode(model.getValue()).then((res) => {
                this.setState({
                  output: res.data.stdout,
                });
              });
            }}
          >
            Run
          </Button>
        </Stack>
        <Stack
          direction={"row"}
          sx={{
            alignItems: "center",
            width: "100%",
            px: "10px",
          }}
        >
          <Box sx={{ p: 1 }}>
            <Box
              id={"editor"}
              sx={{
                width: this.width,
                height: this.height,
                backgroundColor: "#06061f",
              }}
            />
          </Box>
          <Box
            sx={{
              width: 350,
              height: this.height,
              backgroundColor: "#051b30",
              color: "white",
              p: 1,
            }}
          >
            <style>
              {`
                .code-line {
                  height: 10px
                }
              `}
            </style>
            <Typography sx={{ color: "white" }} variant={"h4"}>
              Output:
            </Typography>
            <Box sx={{}}>
              <span>&gt;</span>
              <div>
                {(this.state.output || "").split("\n").map((item, i) => (
                  <p key={i} className={"code-line"}>
                    {item || ""}
                  </p>
                ))}
              </div>
            </Box>
          </Box>
        </Stack>
      </Stack>
    );
  }
}

export default App;
