const webpack = require('webpack');

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            webpackConfig.resolve.fallback = {
                crypto: require.resolve('crypto-browserify'),
                buffer: require.resolve('buffer'),
                stream: require.resolve('stream-browserify'),
            };
            webpackConfig.plugins = [
                ...webpackConfig.plugins,
                new webpack.ProvidePlugin({
                    process: 'process/browser',
                }),
            ];
            return webpackConfig;
        },
    },
};
