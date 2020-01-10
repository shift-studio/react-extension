/* eslint-disable global-require */
import ReactDOM from 'react-dom/server';
import Html from './helpers/html';

export default async function serverEntry(clutchConfig = {}) {
  const {
    element,
    pathname,
    hooks,
    headElements: defaultHeadElements,
    footerElements: defaultFooterElements,
    bodyAttributes: defaultBodyAttributes,
    htmlAttributes: defaultHtmlAttributes,
  } = clutchConfig;

  // html tags and attrs
  const headElements = [...(defaultHeadElements || [])];
  const footerElements = [...(defaultFooterElements || [])];
  const bodyAttributes = Object.assign({}, defaultBodyAttributes);
  const htmlAttributes = Object.assign({}, defaultHtmlAttributes);

  try {
    // initial result
    let result = element || null;

    // hooks options
    const options = {
      element,
      pathname: pathname || '/',
      headElements,
      footerElements,
      bodyAttributes,
      htmlAttributes,
      addHeadElements: (elems) => headElements.push(...elems),
      addFooterElements: (elems) => footerElements.push(...elems),
      addBodyAttributes: (attrs) => {
        Object.assign(bodyAttributes, attrs);
      },
      addHtmlAttributes: (attrs) => {
        Object.assign(htmlAttributes, attrs);
      },
    };

    // server pre render hooks
    for (let i = 0; i < hooks.length; i += 1) {
      const serverHooks = hooks[i] || {};

      if (serverHooks.preRender) {
        // eslint-disable-next-line
        result = await serverHooks.preRender(result, options);
      }
    }

    // SSR rendering
    const bodyContent = ReactDOM.renderToString(result);

    // server post render hooks
    for (let i = 0; i < hooks.length; i += 1) {
      const serverHooks = hooks[i] || {};

      if (serverHooks.postRender) {
        // eslint-disable-next-line
        result = await serverHooks.postRender(options);
      }
    }

    const html = Html({
      htmlAttributes,
      headElements,
      footerElements,
      bodyAttributes,
      bodyContent,
    });

    return html;
  } catch (err) {
    const errMessage =
      err && err.message && err.message.replace(/(\r\n|\n|\r)/gm, '');
    const errStack =
      err && err.stack && err.stack.replace(/(\r\n|\n|\r)/gm, '');

    return Html({
      htmlAttributes: [],
      headElements,
      footerElements: [
        ...footerElements,
        {
          tag: 'script',
          attributes: {
            type: 'text/javascript',
          },
          content: `
          console.warn("Error on SSR: ${errMessage}");
          console.warn("ssr error stack trace: ${errStack}");
        `,
        },
      ],
      bodyAttributes: [],
      bodyContent: '',
    });
  }
}
