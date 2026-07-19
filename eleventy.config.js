/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
    eleventyConfig.addPassthroughCopy({ 'site/public': '/' });
    eleventyConfig.addPassthroughCopy({ 'site/css': 'css' });

    eleventyConfig.addFilter('prefixUrl', (path) => {
        const prefix = '/jinn-tap';
        if (!path || path.startsWith('http')) return path;
        const normalized = path.startsWith('/') ? path : `/${path}`;
        return `${prefix}${normalized}`.replace(/\/{2,}/g, '/');
    });

    eleventyConfig.addFilter('navSection', (navigation, section) =>
        navigation.find((entry) => entry.slug === section),
    );

    eleventyConfig.addFilter('connectorElements', (elements) =>
        elements.filter((el) => el.hasConnector),
    );

    eleventyConfig.addShortcode('jinnTapEmbed', () =>
        `<div class="jinn-tap-embed" style="--jinn-tap-embed-height: 480px">
  <pb-page api-version="1.0.0">
    <jinn-tap format="tei" url="/jinn-tap/demo/starter.xml"></jinn-tap>
    <jinn-toast></jinn-toast>
  </pb-page>
</div>`,
    );

    eleventyConfig.addTransform('prefix-internal-links', (content) =>
        content.replace(/href="\/(editing|guide|api|schema|demo|css|assets)/g, 'href="/jinn-tap/$1'),
    );
}

export const config = {
    dir: {
        input: 'site/src',
        includes: '../_includes',
        data: '../_data',
        output: 'dist',
    },
    pathPrefix: '/jinn-tap/',
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    templateFormats: ['md', 'njk', 'html'],
};
