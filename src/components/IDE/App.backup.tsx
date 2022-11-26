/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018-2022 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import 'monaco-editor/esm/vs/editor/editor.all.js';

// support all editor features
import 'monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneHelpQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickInput/standaloneQuickInputService.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/referenceSearch/standaloneReferenceSearch.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast.js';

import * as monacoEditor from 'monaco-editor'

import React from 'react';
import {Box, Stack, Typography} from "@mui/material";
import normalizeUrl from 'normalize-url';
import {toSocket, WebSocketMessageReader, WebSocketMessageWriter} from 'vscode-ws-jsonrpc';
import {buildWorkerDefinition} from 'monaco-editor-workers';

import {MonacoLanguageClient, CloseAction, ErrorAction, MonacoServices, MessageTransports} from 'monaco-languageclient';
import {StandaloneServices} from 'vscode/services';
import getMessageServiceOverride from 'vscode/service-override/messages';



type P = unknown;
type S = {
    code: string;
}
function createUrl(hostname: string, port: number, path: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return normalizeUrl(`${protocol}://${hostname}:${port}${path}`);
}

function createLanguageClient(transports: MessageTransports): MonacoLanguageClient {
    return new MonacoLanguageClient({
        name: 'pylsp',
        clientOptions: {
            // use a language id as a document selector
            documentSelector: ['python'],
            // disable the default error handler
            errorHandler: {
                error: (error, message, count) => {
                    console.log('MonacoLanguageClient error', error, message, count)
                    return {action: ErrorAction.Continue}
                },
                closed: () => {
                    console.log('MonacoLanguageClient closed')
                    return {action: CloseAction.DoNotRestart}
                }
            },
        },
        // create a language client connection from the JSON RPC connection on demand
        connectionProvider: {
            get: () => {
                return Promise.resolve(transports);
            }
        }
    });
}

class App extends React.Component<P, S> {
    private readonly width: number
    private readonly height: number
    private editor: monacoEditor.editor.IStandaloneCodeEditor | undefined;
    private monaco: typeof monacoEditor | undefined;
    private url = createUrl('localhost', 5000, '/');
    private webSocket = new WebSocket(this.url,);
    private reader: WebSocketMessageReader | undefined;
    private writer: WebSocketMessageWriter | undefined;

    constructor(props: P) {
        super(props);
        this.state = {
            code: 'print("hello")',
        }
        this.width = window.innerWidth - 350
        this.height = window.innerHeight - 100
        this.editorWillMount = this.editorWillMount.bind(this);
        this.editorDidMount = this.editorDidMount.bind(this);
        this.onChange = this.onChange.bind(this);
    }

    editorWillMount(monaco: typeof monacoEditor) {
        this.monaco = monaco;
        console.log('editorWillMount', monaco);
    }

    editorDidMount(editor: monacoEditor.editor.IStandaloneCodeEditor, monaco: typeof monacoEditor) {
        console.log('editorDidMount', editor, monaco);
        editor.focus();
        this.editor = editor;
    }

    onChange(value: string, event: monacoEditor.editor.IModelContentChangedEvent) {
        console.log('onChange', value, event);
        // this.webSocket.send(value);
        // this.writer?.write({jsonrpc: value});
    }

    componentDidMount() {
        console.log('this.webSocket', this.webSocket)
        StandaloneServices.initialize({
            ...getMessageServiceOverride(document.body)
        });
        buildWorkerDefinition('', new URL('', window.location.href).href, false);
        monacoEditor.languages.register({
            id: "python",
            extensions: [".py", ".pyc", ".pyw", "pyo", "pyd"],
            aliases: ["python", "py"]
        });
        this.webSocket.onopen = () => {
            const socket = toSocket(this.webSocket);
            this.reader = new WebSocketMessageReader(socket);
            this.writer = new WebSocketMessageWriter(socket);
            console.log('this.reader', this.reader)
            console.log('this.writer', this.writer)
            const languageClient = createLanguageClient({
                reader: this.reader,
                writer: this.writer,
            });
            languageClient.start().catch(res => {
                console.log(res)
            }).finally(() => {
                console.log(languageClient.diagnostics)
            })
            // languageClient.info()
            this.reader.onClose(() => languageClient.stop());
        };

        setTimeout(() => {
            this.editor = monacoEditor.editor.create(document.getElementById('editor')!, {
                model: monacoEditor.editor.createModel('print("ok")', 'python', monacoEditor.Uri.parse('inmemory://temp.py')),
                glyphMargin: true,
                lightbulb: {
                    enabled: true
                },
                theme: 'vs-dark',
                language: 'python',
                selectOnLineNumbers: true,
            });

            MonacoServices.install();
            console.log('this.editor', this.editor)
            // this.editor.v
        }, 150)
    }

    componentWillUnmount() {
        this.webSocket.close();
    }

    render() {
        const {code} = this.state
        const options: monacoEditor.editor.IStandaloneEditorConstructionOptions = {
            selectOnLineNumbers: true,
            // model: this.monaco.editor.createModel(value, 'python', monaco.Uri.parse('inmemory://temp.py')),
            glyphMargin: true,
            lightbulb: {
                enabled: true
            },
        };
        return (
            <Stack direction={'row'} sx={{alignItems: 'center', height: '100vh', width: '100%', px: '10px'}}>
                <Box sx={{p: 1}}>
                    <Box id={'editor'} sx={{width: this.width, height: this.height, backgroundColor: '#06061f'}}/>
                    {/*<MonacoEditor*/}
                    {/*    width={this.width}*/}
                    {/*    height={this.height}*/}
                    {/*    language="python"*/}
                    {/*    theme="vs-dark"*/}
                    {/*    value={code}*/}
                    {/*    options={options}*/}
                    {/*    // onChange={this.onChange}*/}
                    {/*    editorDidMount={this.editorDidMount}*/}
                    {/*    editorWillMount={this.editorWillMount}*/}
                    {/*/>*/}
                </Box>
                <Box sx={{width: 350, height: this.height, backgroundColor: '#051b30', color: 'white', p: 1,}}>
                    <Typography sx={{color: 'white'}} variant={'h4'}>Output:</Typography>
                    <Box sx={{}}>
                        <p>&gt;</p>
                    </Box>
                </Box>
            </Stack>
        );
    }
}



export default App;


