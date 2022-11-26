import * as monaco from "monaco-editor";

import React from "react";
import { Box, Button, Stack } from "@mui/material";
import {
  toSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from "vscode-ws-jsonrpc";

import {
  MonacoLanguageClient,
  CloseAction,
  ErrorAction,
  MonacoServices,
  MessageTransports,
} from "monaco-languageclient";
import { codeExecuter } from "./CodeExecuter";
import Debugger, {WebsocketConnection} from "./debuger/debugger";
import { createUrl, prepareEditor } from "./helpers";
import type { IdeP, IdeS } from "./types";

type IEditorMouseEvent = monaco.editor.IEditorMouseEvent;

prepareEditor();

const editorValue = `
print("hello world")
print("write codes w")

`;
const pythonTempFilePath = "inmemory://temp.python";
const editorFileUri = monaco.Uri.parse(pythonTempFilePath);
const editorModel = monaco.editor.createModel(
  editorValue,
  "python",
  editorFileUri
);

const printerModel = monaco.editor.createModel(
  "",
  "plaintext",
  monaco.Uri.parse("inmemory://temp.txt")
);

const menuBarHeight = 110;
const printerWidth = 400;

class DebuggerConnection {
  address = "ws://localhost:5678";

  connect() {}

  close() {}

  on(event: "message", listener: (data: string) => void) {
    console.log('on(event: "message"', event);
  }

  // on(event: "closed", listener: () => void) {
  //   console.log('on(event: "closed"', event);
  // }

  sendMessage(
    message: string,
    callback?: (data: any) => void,
    allowListener?: boolean,
    waitUntil?: string[]
  ): boolean {
    console.log("sendMessage", message);
    return true;
  }
}

// const conn = new DebuggerConnection();

const conn = new WebsocketConnection(createUrl("localhost", 5678,''));

export class Ide extends React.PureComponent<IdeP, IdeS> {
  private readonly width: number;
  private readonly height: number;
  private editor: monaco.editor.IStandaloneCodeEditor | undefined;
  private printer: monaco.editor.IStandaloneCodeEditor | undefined;
  private url = createUrl("localhost", 5000, "/");
  private webSocket = new WebSocket(this.url);
  private languageClient: MonacoLanguageClient | undefined;
  private transports: MessageTransports | undefined;
  private code: string = "";
  private debugger: Debugger | undefined;

  constructor(props: IdeP) {
    super(props);
    this.state = {
      output: "",
    };
    this.width = window.innerWidth - printerWidth;
    this.height = window.innerHeight - menuBarHeight;
    this.onChange = this.onChange.bind(this);
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.log(errorInfo);
    console.error(error);
  }

  onChange(event: monaco.editor.IModelContentChangedEvent) {
    // console.log("onChange", event);
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

    this.editor = monaco.editor.create(document.getElementById("editor")!, {
      model: editorModel,
      glyphMargin: true,
      lightbulb: {
        enabled: true,
      },
      theme: "vs-dark",
      language: "python",
      selectOnLineNumbers: true,
    });
    MonacoServices.install();
    editorModel.onDidChangeContent((_event) => {
      this.onChange(_event);
    });
    this.printer = monaco.editor.create(document.getElementById("printer")!, {
      model: printerModel,
      glyphMargin: true,
      lightbulb: {
        enabled: true,
      },
      theme: "vs-dark",
      language: "plaintext",
      selectOnLineNumbers: true,
      readOnly: true,
    });
    console.log("this.editor", this.editor);

    setTimeout(() => {
      this.debugger = new Debugger(
        this.editor as any,
        document.getElementById("editor") as any,
        {
          currentFile: {
            path: pythonTempFilePath,
            // file: "temp.python",
          },
          debugArguments: {},
          language: "python",
        }
      );
      this.debugger?.attachDebugAdapterConnection(conn as any);
      try {
        let self = this;
        // this.debuger
        // @ts-ignore
        function onButton(element?: HTMLElement, data?: any) {
          console.log("this.debugger.onButton", data, element);
          // self.debugger?.breakpoints.breakpoints;
        }

        // @ts-ignore
        function onStart(element?: HTMLElement, data?: any) {
          console.log("this.debugger.onStart", data, element);
        }

        this.debugger.run();
        this.debugger.on("button", onButton as any);
        this.debugger.on("start", onStart as any);
        // @ts-ignore
        this.editor?.onMouseDown((e: IEditorMouseEvent) => {
          console.log("onMouseDown", e);
          // const data = e.target.detail as monaco.editor.IMarginData;
          // if (e.target.type !== MouseTargetType.GUTTER_GLYPH_MARGIN || data.isAfterLines || !this.marginFreeFromNonDebugDecorations(e.target.position.lineNumber)) {
          //   return;
          // }
        });
        // const decorations = this.editor?.deltaDecorations(
        //   [],
        //   [
        //     {
        //       range: new monaco.Range(3, 1, 3, 1),
        //       options: {
        //         isWholeLine: false,
        //         // className: "myContentClass",
        //         glyphMarginClassName: "myGlyphMarginClass",
        //       },
        //     },
        //   ]
        // );
        // this.editor?.

        // Now move the previously created decoration to line 2
        // const targetId = (decorations as any)[0]
        // this.editor?.deltaDecorations(
        //   [targetId],
        //   [
        //     {
        //       range: new monacoEditor.Range(2, 1, 2, 1),
        //       options: {
        //         isWholeLine: true,
        //         className: "myContentClass",
        //         glyphMarginClassName: "glyph-error",
        //       },
        //     },
        //   ]
        // );
        // this.debugger.attachDebugAdapterConnetion()
      } catch (e) {
        console.error(e);
      }
      console.log("this.debugger", this.debugger);
    }, 100);
    // this.debugger.attachDebugAdapterConnetion()
  }

  componentWillUnmount() {
    this.webSocket.close();
  }

  render() {
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
            Run Code 1
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
