function decodeXml(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(x?[0-9a-f]+);/gi, (_match, code: string) => {
      const radix = code.toLowerCase().startsWith("x") ? 16 : 10;
      const digits = radix === 16 ? code.slice(1) : code;
      const point = Number.parseInt(digits, radix);
      const isUnicodeScalar =
        Number.isInteger(point) &&
        point >= 0 &&
        point <= 0x10ffff &&
        (point < 0xd800 || point > 0xdfff);
      return isUnicodeScalar ? String.fromCodePoint(point) : "�";
    })
    .replace(/&([a-z]+);/gi, (_match, entity: string) => named[entity] ?? "");
}

export function plainText(value: string, limit = 500) {
  return decodeXml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

export function normalizeSearch(value: string, limit = 30_000) {
  return plainText(value, limit)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
