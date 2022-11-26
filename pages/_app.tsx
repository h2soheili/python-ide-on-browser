import "../styles/globals.css";
// import 'monaco-editor/esm/vs/base/browser/ui/actionbar/actionbar.css'
import type { AppProps } from "next/app";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";

import { createEmotionCache } from "../src/theme/createEmotionCache";
import { themeGenerator } from "../src/theme";
import { CacheProvider, EmotionCache } from "@emotion/react";

type ExtendedAppProps = AppProps & {
  emotionCache?: EmotionCache;
};

function MyApp(props: ExtendedAppProps) {
  const dir = "ltr";
  const {
    Component,
    emotionCache = createEmotionCache(dir),
    pageProps,
  } = props;
  const theme = themeGenerator(dir);
  return (
    <>
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Component {...pageProps} />
        </ThemeProvider>
      </CacheProvider>
    </>
  );
}

export default MyApp;
