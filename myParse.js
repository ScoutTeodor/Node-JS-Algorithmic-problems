/**
 * Преобразует строку JSON в объект JavaScript.
 *
 * @param {string} json - Строка в формате JSON.
 * @param {Function} [reviver] - Необязательная функция для преобразования результата.
 * Эта функция вызывается для каждого элемента объекта или массива.
 * Если элемент содержит вложенные объекты, они преобразуются раньше, чем внешний объект.
 *
 * @returns {any} - Значение, соответствующее преобразованной строке JSON.
 * @throws {SyntaxError} - Если входная строка JSON содержит ошибку.
 */
function myParse(json, reviver) {
  let index = 0;

  // Основная функция для разбора значения
  function parseValue() {
    skipWhitespace();
    const char = json[index];

    if (char === '"') return parseString();
    if (char === "{") return parseObject();
    if (char === "[") return parseArray();
    if (char === "t") return parseLiteral("true", true);
    if (char === "f") return parseLiteral("false", false);
    if (char === "n") return parseLiteral("null", null);
    if (char === "-" || isDigit(char)) return parseNumber();

    throw new SyntaxError("Unexpected character: ${char}");
  }

  // Разбор строкового значения
  function parseString() {
    index++; // Пропускаем открывающую кавычку "
    let result = "";
    while (json[index] !== '"') {
      if (json[index] === "\\") {
        // Обработка экранированных символов
        index++;
        const escapeChar = json[index];
        const escapes = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: "\n",
          r: "\r",
          t: "\t",
        };
        result += escapes[escapeChar] || escapeChar;
      } else {
        result += json[index];
      }
      index++;
    }
    index++; // Пропускаем закрывающую кавычку "
    return result;
  }

  // Разбор объекта
  function parseObject() {
    index++; // Пропускаем открывающую фигурную скобку {
    const result = {};
    skipWhitespace();
    if (json[index] === "}") {
      index++; // Пропускаем закрывающую фигурную скобку }
      return applyReviver(result);
    }
    while (true) {
      skipWhitespace();
      const key = parseString(); // Читаем ключ
      skipWhitespace();
      if (json[index] !== ":") throw new SyntaxError('Expected ":"');
      index++; // Пропускаем :
      skipWhitespace();
      const value = parseValue(); // Читаем значение
      result[key] = value;
      skipWhitespace();
      if (json[index] === "}") {
        index++; // Пропускаем закрывающую скобку }
        break;
      }
      if (json[index] !== ",") throw new SyntaxError('Expected ","');
      index++; // Пропускаем ,
    }
    return applyReviver(result);
  }

  // Разбор массива
  function parseArray() {
    index++; // Пропускаем открывающую квадратную скобку [
    const result = [];
    skipWhitespace();
    if (json[index] === "]") {
      index++; // Пропускаем закрывающую квадратную скобку ]
      return applyReviver(result);
    }
    while (true) {
      skipWhitespace();
      result.push(parseValue());
      skipWhitespace();
      if (json[index] === "]") {
        index++; // Пропускаем закрывающую скобку ]
        break;
      }
      if (json[index] !== ",") throw new SyntaxError('Expected ","');
      index++; // Пропускаем ,
    }
    return applyReviver(result);
  }

  // Разбор литералов (true, false, null)
  function parseLiteral(literal, value) {
    if (json.slice(index, index + literal.length) === literal) {
      index += literal.length;
      return value;
    }
    throw new SyntaxError("Unexpected token: ${literal}");
  }

  // Разбор чисел
  function parseNumber() {
    const numberRegex = /-?\d+(\.\d+)?([eE][+-]?\d+)?/y;
    numberRegex.lastIndex = index;
    const match = numberRegex.exec(json);
    if (!match) throw new SyntaxError("Invalid number");
    index += match[0].length;
    return Number(match[0]);
  }

  // Проверка, является ли символ цифрой
  function isDigit(char) {
    return char >= "0" && char <= "9";
  }

  // Пропуск пробелов
  function skipWhitespace() {
    while (/\s/.test(json[index])) index++;
  }

  // Применение функции reviver
  function applyReviver(obj) {
    if (typeof reviver !== "function") return obj;

    // Рекурсивное применение reviver к объектам
    function recursiveRevive(holder) {
      for (const key in holder) {
        if (Object.hasOwn(holder, key)) {
          const value = holder[key];
          const newValue = reviver.call(holder, key, value);
          if (newValue === undefined) {
            delete holder[key]; // Удаляем ключ, если reviver возвращает undefined
          } else {
            holder[key] = newValue;
            if (typeof holder[key] === "object" && holder[key] !== null) {
              recursiveRevive(holder[key]);
            }
          }
        }
      }
    }

    if (typeof obj === "object" && obj !== null) {
      recursiveRevive({ "": obj });
    }
    return obj;
  }

  const result = parseValue();
  skipWhitespace();
  if (index < json.length) throw new SyntaxError("Unexpected extra characters");
  return typeof reviver === "function" ? reviver("", result) : result;
}

// Тесты
const assert = require("assert");
assert.strictEqual(myParse('"hello"'), JSON.parse('"hello"'));

// Тесты для строк
assert.strictEqual(myParse('"hello"'), JSON.parse('"hello"'));
assert.strictEqual(myParse('"test"'), JSON.parse('"test"'));
assert.strictEqual(myParse('"line\\nfeed"'), JSON.parse('"line\\nfeed"'));

// Тесты для чисел
assert.strictEqual(myParse("42"), JSON.parse("42"));
assert.strictEqual(myParse("-42.3"), JSON.parse("-42.3"));
assert.strictEqual(myParse("1e6"), JSON.parse("1e6"));
assert.strictEqual(myParse("-3.14E-2"), JSON.parse("-3.14E-2"));

// Тесты для объектов
assert.deepStrictEqual(
  myParse('{"name":"Alice","age":30}'),
  JSON.parse('{"name":"Alice","age":30}')
);
assert.deepStrictEqual(
  myParse('{"nested":{"key":"value"}}'),
  JSON.parse('{"nested":{"key":"value"}}')
);

// Тесты для массивов
assert.deepStrictEqual(myParse("[1,2,3]"), JSON.parse("[1,2,3]"));
assert.deepStrictEqual(
  myParse('[1,null,true,{"key":"value"}]'),
  JSON.parse('[1,null,true,{"key":"value"}]')
);

// Тесты для литералов
assert.strictEqual(myParse("true"), JSON.parse("true"));
assert.strictEqual(myParse("false"), JSON.parse("false"));
assert.strictEqual(myParse("null"), JSON.parse("null"));

// С reviver
const json = '{"name":"Alice","age":25,"birth":"2000-01-01"}';

// Преобразование дат
assert.deepStrictEqual(
  myParse(json, (key, value) => (key === "birth" ? new Date(value) : value)),
  JSON.parse(json, (key, value) => (key === "birth" ? new Date(value) : value))
);

// Удаление ключей
assert.deepStrictEqual(
  myParse(json, (key, value) => (key === "age" ? undefined : value)),
  JSON.parse(json, (key, value) => (key === "age" ? undefined : value))
);

console.log("Все тесты пройдены успешно!");
