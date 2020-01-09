// html attributes deserialization
const getHtmlAttributes = (attrs) => {
  let result = '';

  if (attrs) {
    if (Array.isArray(attrs)) {
      result = attrs
        .map((attr) => {
          let res = '';

          if (typeof attr === 'string') {
            res = attr;
          } else {
            res = `${attr.name}="${attr.value}"`;
          }

          return res;
        })
        .join(' ');
    } else if (typeof attrs === 'object') {
      result = Object.keys(attrs)
        .map((attrName) => {
          const attrValue = attrs[attrName];

          return `${attrName}="${attrValue}"`;
        })
        .join(' ');
    }
  }

  return result;
};

// tags array deserialization
const insertTags = (tags) => {
  let result = '';

  if (tags && tags.length) {
    result = tags
      .map((tag) => {
        let res = '';

        if (typeof tag === 'string') {
          res = tag;
        } else {
          res = `<${tag.tag} ${getHtmlAttributes(tag.attributes)}>`;

          if (tag.tag !== 'meta' && tag.tag !== 'link') {
            res += `${tag.content || ''}</${tag.tag}>`;
          }
        }

        return res;
      })
      .join('\n');
  }

  return result;
};

export default ({
  htmlAttributes,
  headElements,
  footerElements,
  bodyAttributes,
  bodyContent,
}) => `<!DOCTYPE html>
<html ${getHtmlAttributes(htmlAttributes)}>
  <head>
    <meta charset="UTF-8">
    ${insertTags(headElements)}
  </head>
  <body ${getHtmlAttributes(bodyAttributes)}>
    <div id='root'>
      ${bodyContent}
    </div>
    ${insertTags(footerElements)}
  </body>
</html>
`;
