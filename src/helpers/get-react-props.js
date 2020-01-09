import camelize from './camelize';

const PROPS_MAP = {
  accesskey: 'accessKey',
  allowfullscreen: 'allowFullScreen',
  allowtransparency: 'allowTransparency',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  autoplay: 'autoPlay',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  charset: 'charSet',
  classid: 'classID',
  classname: 'className',
  colspan: 'colSpan',
  contenteditable: 'contentEditable',
  contextmenu: 'contextMenu',
  crossorigin: 'crossOrigin',
  datetime: 'dateTime',
  enctype: 'encType',
  formaction: 'formAction',
  formenctype: 'formEncType',
  formmethod: 'formMethod',
  formnovalidate: 'formNoValidate',
  formtarget: 'formTarget',
  frameborder: 'frameBorder',
  hreflang: 'hrefLang',
  for: 'htmlFor',
  httpequiv: 'httpEquiv',
  inputmode: 'inputMode',
  keyparams: 'keyParams',
  keytype: 'keyType',
  marginheight: 'marginHeight',
  marginwidth: 'marginWidth',
  maxlength: 'maxLength',
  mediagroup: 'mediaGroup',
  minlength: 'minLength',
  novalidate: 'noValidate',
  radiogroup: 'radioGroup',
  readonly: 'readOnly',
  rowspan: 'rowSpan',
  spellcheck: 'spellCheck',
  srcdoc: 'srcDoc',
  srclang: 'srcLang',
  srcset: 'srcSet',
  tabindex: 'tabIndex',
  usemap: 'useMap',
};

const dataAriaRegex = /^(aria|data)-.+$/;

function reactSpecialProp(attrName) {
  let result;

  if (dataAriaRegex.test(attrName)) {
    result = attrName;
  } else {
    result = PROPS_MAP[attrName] || attrName;
  }

  return result;
}

export default function getReactProps(attributes) {
  const result = {};

  if (attributes) {
    Object.keys(attributes).forEach((name) => {
      const value = attributes[name];
      const propName = reactSpecialProp(name);

      if (propName === 'style') {
        const styles = {};
        const stylesStrs = value.split(';');

        stylesStrs.forEach((styleStr) => {
          const parts = styleStr.split(':');

          if (parts.length === 2) {
            styles[camelize(parts[0].trim())] = parts[1].trim();
          }
        });

        result[propName] = styles;
      } else {
        result[propName] = value;
      }
    });
  }

  return result;
}
