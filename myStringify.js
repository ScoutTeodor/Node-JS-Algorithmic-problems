/**
 * Преобразует значение JavaScript в строку JSON.
 *
 * @param {any} value - Значение для сериализации.
 * @param {Function} [replacer] - Необязательная функция для трансформации ключей и значений.
 * @param {number|string} [space] - Необязательный параметр для форматирования (отступы).
 * @returns {string} - Строка в формате JSON.
 */
function myStringify(value, replacer = null, space = 0) {
  const indent = typeof space === "number" ? " ".repeat(space) : space || "";
  const stack = [];
  const replacerFn = typeof replacer === "function" ? replacer : null;

  function stringifyValue(key, value, depth) {
    value = applyReplacer(key, value);
    if (value === null) return "null";
    if (typeof value === "string") return `"${escapeString(value)}"`;
    if (typeof value === "number")
      return isFinite(value) ? String(value) : "null";
    if (typeof value === "boolean") return String(value);
    if (typeof value === "object") {
      if (stack.includes(value)) throw new TypeError("cyclic object value");
      return Array.isArray(value)
        ? stringifyArray(value, depth)
        : stringifyObject(value, depth);
    }
    // Unsupported types
    return undefined;
  }

  function stringifyArray(array, depth) {
    stack.push(array);
    const result = array
      .map((item) => stringifyValue("", item, depth + 1) ?? "null")
      .join(indent ? ",\n" + indent.repeat(depth + 1) : ",");
    stack.pop();
    return `[${
      indent
        ? "\n" + indent.repeat(depth + 1) + result + "\n" + indent.repeat(depth)
        : result
    }]`;
  }

  function stringifyObject(obj, depth) {
    stack.push(obj);
    const result = Object.entries(obj)
      .filter(([key, value]) => stringifyValue(key, value, depth) !== undefined)
      .map(
        ([key, value]) =>
          `${indent ? indent.repeat(depth + 1) : ""}"${key}":${
            indent ? " " : ""
          }${stringifyValue(key, value, depth + 1)}`
      )
      .join(indent ? ",\n" : ",");
    stack.pop();
    return `{${indent ? "\n" + result + "\n" + indent.repeat(depth) : result}}`;
  }

  function applyReplacer(key, value) {
    if (replacerFn) return replacerFn(key, value);
    return value;
  }

  function escapeString(str) {
    return str.replace(/["\\\b\f\n\r\t]/g, (char) => {
      const escapes = {
        '"': '\\"',
        "\\": "\\\\",
        "\b": "\\b",
        "\f": "\\f",
        "\n": "\\n",
        "\r": "\\r",
        "\t": "\\t",
      };
      return escapes[char] || char;
    });
  }

  return stringifyValue("", value, 0);
}

// Тесты
const assert = require("assert");

assert.strictEqual(myStringify(null), JSON.stringify(null));
assert.strictEqual(myStringify(true), JSON.stringify(true));
assert.strictEqual(myStringify(false), JSON.stringify(false));

assert.strictEqual(myStringify(42), JSON.stringify(42));

assert.strictEqual(myStringify("hello"), JSON.stringify("hello"));

assert.strictEqual(myStringify(undefined), JSON.stringify(undefined));

assert.strictEqual(
  myStringify([1, 2, "three", null]),
  JSON.stringify([1, 2, "three", null])
);

assert.strictEqual(
  myStringify([1, undefined, "text"]),
  JSON.stringify([1, undefined, "text"])
);

assert.strictEqual(
  myStringify({ name: "Alice", age: 25 }),
  JSON.stringify({ name: "Alice", age: 25 })
);

assert.strictEqual(
  myStringify({ user: { name: "Bob", items: [1, 2, null] } }),
  JSON.stringify({ user: { name: "Bob", items: [1, 2, null] } })
);

assert.strictEqual(
  myStringify({
    name: "Alice",
    age: undefined,
    greet: () => {},
    nested: { inner: undefined },
  }),
  JSON.stringify({
    name: "Alice",
    age: undefined,
    greet: () => {},
    nested: { inner: undefined },
  })
);

const obj = {};
obj.self = obj;
assert.throws(() => myStringify(obj), /cyclic/);

assert.strictEqual(
  myStringify({ name: "Alice", age: 25 }, null, 2),
  JSON.stringify({ name: "Alice", age: 25 }, null, 2)
);

console.log("Все тесты пройдены успешно!");
