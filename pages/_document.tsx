// @ts-ignore
import createEmotionServer from '@emotion/server/create-instance';
// eslint-disable-next-line @next/next/no-document-import-in-page
import Document, {Head, Html, Main, NextScript} from 'next/document';
import * as React from 'react';
import {createEmotionCache} from "../src/theme/createEmotionCache";


class MyDocument extends Document {
    render() {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const {locale = 'en', emotionStyleTags = null} = this.props;
        return (
            <Html lang={locale} dir={locale === 'fa' ? 'rtl' : 'ltr'}>
                <Head>
                    {/* Inject MUI styles first to match with the prepend: true configuration. */}
                    {emotionStyleTags ? emotionStyleTags : null}
                </Head>
                <body>
                <Main/>
                <div id='portal'/>
                <NextScript/>
                </body>
            </Html>
        );
    }
}

MyDocument.getInitialProps = async (ctx) => {
    // Resolution order
    //
    // On the server:
    // 1. app.getInitialProps
    // 2. page.getInitialProps
    // 3. document.getInitialProps
    // 4. app.render
    // 5. page.render
    // 6. document.render
    //
    // On the server with error:
    // 1. document.getInitialProps
    // 2. app.render
    // 3. page.render
    // 4. document.render
    //
    // On the client
    // 1. app.getInitialProps
    // 2. page.getInitialProps
    // 3. app.render
    // 4. page.render

    const originalRenderPage = ctx.renderPage;

    // You can consider sharing the same emotion cache between all the SSR requests to speed up performance.
    // However, be aware that it can have global side effects.
    const dir = (ctx.locale || 'fa') === 'fa' ? 'rtl' : 'ltr';
    const cache = createEmotionCache(dir);
    const {extractCriticalToChunks} = createEmotionServer(cache);

    ctx.renderPage = () =>
        originalRenderPage({
            enhanceApp: (App: any) =>
                function EnhanceApp(props) {
                    return <App emotionCache={cache} {...props} />;
                },
        });

    const initialProps = await Document.getInitialProps(ctx);
    // This is important. It prevents emotion to render invalid HTML.
    // See https://github.com/mui/material-ui/issues/26561#issuecomment-855286153
    const emotionStyles = extractCriticalToChunks(initialProps.html);
    const emotionStyleTags = emotionStyles.styles.map((style) => (
        <style
            data-emotion={`${style.key} ${style.ids.join(' ')}`}
            key={style.key}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{__html: style.css}}
        />
    ));

    return {
        ...initialProps,
        emotionStyleTags,
    };
};
export default MyDocument;
