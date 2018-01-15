'use strict';

const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = (
  neutrino,
  { shouldUseSourceMap = true, shouldUseRelativeAssetPaths, cssFilename } = {}
) => {
  // ExtractTextPlugin expects the build output to be flat.
  // (See https://github.com/webpack-contrib/extract-text-webpack-plugin/issues/27)
  // However, our output is structured with css, js and media folders.
  // To have this structure working with relative paths, we have to use custom options.
  const extractTextPluginOptions = shouldUseRelativeAssetPaths
    ? // Making sure that the publicPath goes back to to build folder.
      { publicPath: Array(cssFilename.split('/').length).join('../') }
    : {};

  neutrino.config.module
    .rule('assets')
    // "postcss" loader applies autoprefixer to our CSS.
    // "css" loader resolves paths in CSS and adds assets as dependencies.
    // "style" loader turns CSS into JS modules that inject <style> tags.
    // In production, we use a plugin to extract that CSS to a file, but
    // in development "style" loader enables hot editing of CSS.
    .when(process.env.NODE_ENV === 'development', rule => {
      rule
        .oneOf('css-loader')
        .test(/\.css$/)
        .use('style-loader')
        .loader(require.resolve('style-loader'))
        .end()
        .use('css-loader')
        .loader(require.resolve('css-loader'))
        .options({
          importLoaders: 1,
        })
        .end()
        .use('postcss-loader')
        .loader(require.resolve('postcss-loader'))
        .options({
          // Necessary for external CSS imports to work
          // https://github.com/facebookincubator/create-react-app/issues/2677
          ident: 'postcss',
          plugins: () => [
            require('postcss-flexbugs-fixes'),
            autoprefixer({
              flexbox: 'no-2009',
            }),
          ],
        })
        .end()
        .end();
    })
    // The notation here is somewhat confusing.
    // "postcss" loader applies autoprefixer to our CSS.
    // "css" loader resolves paths in CSS and adds assets as dependencies.
    // "style" loader normally turns CSS into JS modules injecting <style>,
    // but unlike in development configuration, we do something different.
    // `ExtractTextPlugin` first applies the "postcss" and "css" loaders
    // (second argument), then grabs the result CSS and puts it into a
    // separate file in our build process. This way we actually ship
    // a single CSS file in production instead of JS code injecting <style>
    // tags. If you use code splitting, however, any async bundles will still
    // use the "style" loader inside the async code so CSS from them won't be
    // in the main CSS file.
    .when(process.env.NODE_ENV === 'production', rule => {
      const apply = rule.oneOf('css-loader').test(/\.css$/);
      ExtractTextPlugin.extract(
        Object.assign(
          {
            fallback: {
              loader: require.resolve('style-loader'),
              options: {
                hmr: false,
              },
            },
            use: [
              {
                loader: require.resolve('css-loader'),
                options: {
                  importLoaders: 1,
                  minimize: true,
                  sourceMap: shouldUseSourceMap,
                },
              },
              {
                loader: require.resolve('postcss-loader'),
                options: {
                  // Necessary for external CSS imports to work
                  // https://github.com/facebookincubator/create-react-app/issues/2677
                  ident: 'postcss',
                  plugins: () => [
                    require('postcss-flexbugs-fixes'),
                    autoprefixer({
                      flexbox: 'no-2009',
                    }),
                  ],
                },
              },
            ],
          },
          extractTextPluginOptions
        )
      ).forEach(({ loader, options }, index) =>
        apply.use(`style-${index}`).loader(loader, loader, options)
      );
    });
};
