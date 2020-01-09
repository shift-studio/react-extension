/**
 * Turns a hyphen seperated string into camel case string
 * e.g border-radius -> borderRadius
 *
 * @param {String} str String to convert
 *
 * @returns {String} camelized string
 */
const regex = /(-?[a-zA-Z]+)-([a-z])(.+)/;

export default function camelize(str, sep = '') {
  let result = str;
  let match = result.match(regex);

  while (match) {
    result = `${match[1]}${sep}${match[2].toUpperCase()}${match[3]}`;
    match = result.match(regex);
  }

  return result;
}
