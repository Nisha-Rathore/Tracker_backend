const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (isPlainObject(value)) {
    const clean = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key) || key.startsWith("$") || key.includes(".")) continue;
      clean[key] = sanitizeValue(nestedValue);
    }

    return clean;
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
};

export const sanitizeRequest = (req, res, next) => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};
