/** @type {import('next').NextConfig} */
const withCSS = require('@zeit/next-css');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

// const nextConfig = {
//     reactStrictMode: true,
//     swcMinify: true,
// }

const withTM = require("next-transpile-modules")([
    // `monaco-editor` isn't published to npm correctly: it includes both CSS
    // imports and non-Node friendly syntax, so it needs to be compiled.
    "monaco-editor"
]);


const nextConfig = withTM({
    reactStrictMode: false,
    swcMinify: false,
    typescript: {
        ignoreBuildErrors: true
    },
    webpack(config, options) {
        const rule = config.module.rules
            .find(rule => rule.oneOf)
            .oneOf.find(
                r =>
                    // Find the global CSS loader
                    r.issuer && r.issuer.include && r.issuer.include.includes("_app")
            );
        if (rule) {
            rule.issuer.include = [
                rule.issuer.include,
                // Allow `monaco-editor` to import global CSS:
                /[\\/]node_modules[\\/]monaco-editor[\\/]/
            ];
        }
        config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: [
                {
                    loader: '@svgr/webpack',
                    options: {
                        typescript: true,
                        icon: true
                    }
                }
            ]
        });

        config.plugins.push(new MonacoWebpackPlugin({
            languages: ["python", "json", "javascript", "typescript"],
        }));
        config.resolve.fallback = {
            ...config.resolve.fallback,
            path: require.resolve("path-browserify"),
            "monaco-editor": "monaco-editor/esm/vs/editor/editor.api.js",
        };
        return config;
    },
})

module.exports = nextConfig
