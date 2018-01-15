'use strict';

const path = require('path');
const webpack = require('webpack');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const SWPrecacheWebpackPlugin = require('sw-precache-webpack-plugin');
const eslintFormatter = require('react-dev-utils/eslintFormatter');

const middlewareCss = require('./middleware/css');

// The development config is focused on developer experience and fast rebuilds.

// The production config compiles slowly and is focused on producing a fast and
// minimal bundle.

const cssFilename = 'static/css/[name].[contenthash:8].css';

module.exports = (
  neutrino,
  { entry, paths, publicPath, env, shouldUseSourceMap = true } = {}
) => {
  // Some apps do not use client-side routing with pushState.
  // For these, "homepage" can be set to "." to enable relative asset paths.
  const shouldUseRelativeAssetPaths = publicPath === './';

  neutrino.config.when(process.env.NODE_ENV === 'production', config => {
    // Don't attempt to continue if there are any errors.
    config.bail(true);

    // We generate sourcemaps in production. This is slow but gives good results.
    // You can exclude the *.map files from the build during deployment.
    config.devtool(shouldUseSourceMap ? 'source-map' : false);
  });
  neutrino.config.when(process.env.NODE_ENV === 'development', config =>
    // You may want 'eval' instead if you prefer to see the compiled output in DevTools.
    // See the discussion in https://github.com/facebookincubator/create-react-app/issues/343.
    config.devtool('cheap-module-eval-source-map')
  );

  entry = Array.isArray(entry) ? entry : [entry];
  neutrino.config
    .entry('index')
    .clear()
    .merge(entry)
    .end();

  // prettier-ignore
  neutrino.config.resolve
    .modules
      // This allows you to set a fallback for where Webpack should look for modules.
      // We placed these paths second because we want `node_modules` to "win"
      // if there are any conflicts. This matches Node resolution mechanism.
      // https://github.com/facebookincubator/create-react-app/issues/253
      .clear()
      .add('node_modules')
      .add(paths.appNodeModules)
      .merge(
        // It is guaranteed to exist because we tweak it in `env.js`
        process.env.NODE_PATH.split(path.delimiter).filter(Boolean)
      )
      .end()
    .extensions
      .clear()
      // These are the reasonable defaults supported by the Node ecosystem.
      // We also include JSX as a common component filename extension to support
      // some tools, although we do not recommend using it, see:
      // https://github.com/facebookincubator/create-react-app/issues/290
      // `web` extension prefixes have been added for better support
      // for React Native Web.
      .merge(['.web.js', '.mjs', '.js', '.json', '.web.jsx', '.jsx'])
      .end()
    .alias
      .set(
        // Resolve Babel runtime relative to react-scripts.
        // It usually still works on npm 3 without this but it would be
        // unfortunate to rely on, as react-scripts could be symlinked,
        // and thus @babel/runtime might not be resolvable from the source.
        '@babel/runtime',
        path.dirname(require.resolve('@babel/runtime/package.json'))
      )
      // Support React Native Web
      // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
      .set('react-native', 'react-native-web')
      .end()
    // Prevents users from importing files from outside of src/ (or node_modules/).
    // This often causes confusion because we only process files within src/ with babel.
    // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
    // please link the files into your node_modules/ and let module-resolution kick in.
    // Make sure your source files are compiled, as they will not be processed in any way.
    .plugin('ModuleScopePlugin')
      .use(ModuleScopePlugin, [paths.appSrc, [paths.appPackageJson]])
      .end();

  // Some libraries import Node modules but don't use them in the browser.
  // Tell Webpack to provide empty mocks for them so importing them works.
  neutrino.config.node
    .set('dgram', 'empty')
    .set('fs', 'empty')
    .set('net', 'empty')
    .set('tls', 'empty')
    .set('child_process', 'empty')
    .end();

  neutrino.config.output
    .publicPath(
      // We inferred the "public path" (such as / or /my-project) from homepage.
      publicPath
    )
    .when(process.env.NODE_ENV === 'development', output => {
      output.pathinfo(
        // Add /* filename */ comments to generated require()s in the output.
        true
      );
      output.filename(
        // This does not produce a real file. It's just the virtual path that is
        // served by WebpackDevServer in development. This is the JS bundle
        // containing code from all our entry points, and the Webpack runtime.
        'static/js/bundle.js'
      );
      output.chunkFilename(
        // There are also additional JS chunk files if you use code splitting.
        'static/js/[name].chunk.js'
      );
      output.devtoolModuleFilenameTemplate(
        // Point sourcemap entries to original disk location (format as URL on Windows)
        info => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')
      );
    })
    .when(process.env.NODE_ENV === 'production', output => {
      output.path(
        // The build folder.
        paths.appBuild
      );
      output.filename(
        // Generated JS file names (with nested folders).
        // There will be one main bundle, and one file per asynchronous chunk.
        // We don't currently advertise code splitting but Webpack supports it.
        'static/js/[name].[chunkhash:8].js'
      );
      output.chunkFilename('static/js/[name].[chunkhash:8].chunk.js');
      output.devtoolModuleFilenameTemplate(
        // Point sourcemap entries to original disk location (format as URL on Windows)
        info =>
          path
            .relative(paths.appSrc, info.absoluteResourcePath)
            .replace(/\\/g, '/')
      );
    });

  neutrino.config.merge({
    module: {
      strictExportPresence: true,
    },
  });
  neutrino.config.module.rule('require-ensure').parser(
    // Disable require.ensure as it's not a standard language feature.
    { requireEnsure: false }
  );

  // prettier-ignore
  neutrino.config.module
    // First, run the linter.
    // It's important to do this before Babel processes the JS.
    .rule('linter')
      .test(/\.(js|jsx|mjs)$/)
      .pre()
      .use('eslint')
      .loader(require.resolve('eslint-loader'))
        .options({
          formatter: eslintFormatter,
          eslintPath: require.resolve('eslint'),
          // @remove-on-eject-begin
          // TODO: consider separate config for production,
          // e.g. to enable no-console and no-debugger only in production.
          baseConfig: {
            extends: [require.resolve('eslint-config-react-app')],
          },
          ignore: false,
          useEslintrc: false,
          // @remove-on-eject-end
        })
        .end()
      .include
        .add(paths.appSrc)
        .end();

  // "oneOf" will traverse all following loaders until one will
  // match the requirements. When no loader matches it will fall
  // back to the "file" loader at the end of the loader list.
  // A missing `test` is equivalent to a match.
  // prettier-ignore
  neutrino.config.module
    .rule('assets')
      // "url" loader works just like "file" loader but it also embeds
      // assets smaller than specified size as data URLs to avoid requests.F
      .oneOf('url-loader')
        .test([/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/])
        .include
          .add(paths.appSrc)
          .end()
        .use('url-loader')
          .loader(require.resolve('url-loader'))
          .options({
            limit: 10000,
            name: 'static/media/[name].[hash:8].[ext]',
          })
          .end()
        .end()
      // Process application JS with Babel.
      // The preset includes JSX, Flow, and some ESnext features.
      .oneOf('babel-app')
        .test(/\.(js|jsx|mjs)$/)
        .include
          .add(paths.appSrc)
          .end()
        // This loader parallelizes code compilation, it is optional but
        // improves compile time on larger projects
        .use('thread-loader')
          .loader(require.resolve('thread-loader'))
          .end()
        .use('babel-loader')
          .loader(require.resolve('babel-loader'))
          .options({
            // @remove-on-eject-begin
            babelrc: false,
            presets: [require.resolve('babel-preset-react-app')],
            // @remove-on-eject-end
            compact: true, // TODO: false in dev
            // TODO: cache?
          })
          .end()
        .end()
      // Process any JS outside of the app with Babel.
      // Unlike the application JS, we only compile the standard ES features.
      .oneOf('babel-modules')
        .test(/\.js$/)
        // This loader parallelizes code compilation, it is optional but
        // improves compile time on larger projects
        .use('thread-loader')
          .loader(require.resolve('thread-loader'))
          .end()
        .use('babel-loader')
          .loader(require.resolve('babel-loader'))
          .options({
            babelrc: false,
            compact: false,
            presets: [
              require.resolve('babel-preset-react-app/dependencies'),
            ],
            cacheDirectory: true, // TODO: we enable diff plugins on env switch
          })
          .end()
        .end();
  neutrino.use(middlewareCss, {
    shouldUseSourceMap,
    shouldUseRelativeAssetPaths,
    cssFilename,
  });
  // prettier-ignore
  neutrino.config.module
    .rule('assets')
      // "file" loader makes sure those assets get served by WebpackDevServer.
      // When you `import` an asset, you get its (virtual) filename.
      // In production, they would get copied to the `build` folder.
      // This loader doesn't use a "test" so it will catch all modules
      // that fall through the other loaders.
      .oneOf('file-loader')
        // Exclude `js` files to keep "css" loader working as it injects
        // it's runtime that would otherwise processed through "file" loader.
        // Also exclude `html` and `json` extensions so they get processed
        // by webpacks internal loaders.
        .exclude
          .add([/\.(js|jsx|mjs)$/, /\.html$/, /\.json$/])
          .end()
        .use('file-loader')
          .loader(require.resolve('file-loader'))
          .options({
            name: 'static/media/[name].[hash:8].[ext]',
          })
          .end();

  neutrino.config
    .plugin('interpolate-html')
    .use(
      // Makes some environment variables available in index.html.
      // The public URL is available as %PUBLIC_URL% in index.html, e.g.:
      // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
      // In development, this will be an empty string.
      InterpolateHtmlPlugin,
      [env.raw]
    );

  neutrino.config.when(process.env.NODE_ENV === 'development', config => {
    // Generates an `index.html` file with the <script> injected.
    config.plugin('html').use(HtmlWebpackPlugin, [
      {
        inject: true,
        template: paths.appHtml,
      },
    ]);
  });
  neutrino.config.when(process.env.NODE_ENV === 'production', config => {
    // Generates an `index.html` file with the <script> injected.
    config.plugin('html').use(HtmlWebpackPlugin, [
      {
        inject: true,
        template: paths.appHtml,
        minify: {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        },
      },
    ]);
  });
  neutrino.config.when(process.env.NODE_ENV === 'development', config => {
    config.plugin('named-modules').use(
      // Add module names to factory functions so they appear in browser profiler.
      webpack.NamedModulesPlugin
    );
  });
  neutrino.config
    .plugin('define')
    .use(
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
      webpack.DefinePlugin,
      [env.stringified]
    );
  neutrino.config.when(process.env.NODE_ENV === 'development', config => {
    config.plugin('hot').use(
      // This is necessary to emit hot updates (currently CSS only):
      webpack.HotModuleReplacementPlugin
    );
    config.plugin('case-sensitive-paths').use(
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebookincubator/create-react-app/issues/240
      CaseSensitivePathsPlugin
    );
    config
      .plugin('missing-node-modules')
      .use(
        // If you require a missing module and then `npm install` it, you still have
        // to restart the development server for Webpack to discover it. This plugin
        // makes the discovery automatic so you don't have to restart.
        // See https://github.com/facebookincubator/create-react-app/issues/186
        WatchMissingNodeModulesPlugin,
        [paths.appNodeModules]
      );
  });
  neutrino.config.when(process.env.NODE_ENV === 'production', config => {
    // Minify the code.
    config.plugin('minify').use(UglifyJsPlugin, [
      {
        uglifyOptions: {
          ecma: 8,
          compress: {
            warnings: false,
            // Disabled because of an issue with Uglify breaking seemingly valid code:
            // https://github.com/facebookincubator/create-react-app/issues/2376
            // Pending further investigation:
            // https://github.com/mishoo/UglifyJS2/issues/2011
            comparisons: false,
          },
          mangle: {
            safari10: true,
          },
          output: {
            comments: false,
            // Turned on because emoji and regex is not minified properly using default
            // https://github.com/facebookincubator/create-react-app/issues/2488
            ascii_only: true,
          },
        },
        // Use multi-process parallel running to improve the build speed
        // Default number of concurrent runs: os.cpus().length - 1
        parallel: true,
        // Enable file caching
        cache: true,
        sourceMap: shouldUseSourceMap,
      },
    ]);

    config
      .plugin('extract-text')
      .use(
        // Note: this won't work without ExtractTextPlugin.extract(..) in `loaders`.
        ExtractTextPlugin,
        [{ filename: cssFilename }]
      );

    config
      .plugin('manifest')
      .use(
        // Generate a manifest file which contains a mapping of all asset filenames
        // to their corresponding output file so that tools can pick it up without
        // having to parse `index.html`.
        ManifestPlugin,
        [{ fileName: 'asset-manifest.json' }]
      );

    config
      .plugin('service-worker')
      .use(
        // Generate a service worker script that will precache, and keep up to date,
        // the HTML & assets that are part of the Webpack build.
        SWPrecacheWebpackPlugin,
        [
          {
            // By default, a cache-busting query parameter is appended to requests
            // used to populate the caches, to ensure the responses are fresh.
            // If a URL is already hashed by Webpack, then there is no concern
            // about it being stale, and the cache-busting can be skipped.
            dontCacheBustUrlsMatching: /\.\w{8}\./,
            filename: 'service-worker.js',
            logger(message) {
              if (message.indexOf('Total precache size is') === 0) {
                // This message occurs for every build and is a bit too noisy.
                return;
              }
              if (message.indexOf('Skipping static resource') === 0) {
                // This message obscures real errors so we ignore it.
                // https://github.com/facebookincubator/create-react-app/issues/2612
                return;
              }
              console.log(message);
            },
            minify: true,
            // Don't precache sourcemaps (they're large) and build asset manifest:
            staticFileGlobsIgnorePatterns: [/\.map$/, /asset-manifest\.json$/],
            // `navigateFallback` and `navigateFallbackWhitelist` are disabled by default; see
            // https://github.com/facebookincubator/create-react-app/blob/master/packages/react-scripts/template/README.md#service-worker-considerations
            // navigateFallback: publicUrl + '/index.html',
            // navigateFallbackWhitelist: [/^(?!\/__).*/],
          },
        ]
      );
  });
  neutrino.config
    .plugin('ignore')
    .use(
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how Webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      webpack.IgnorePlugin,
      [/^\.\/locale$/, /moment$/]
    );

  // Turn off performance hints during development because we don't do any
  // splitting or minification in interest of speed. These warnings become
  // cumbersome.
  neutrino.config.performance.hints(false);
};
