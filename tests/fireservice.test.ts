import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

import { parseFireServiceBoard } from "../app/api/updates/fireservice";
import { plainText } from "../app/api/updates/text";

const fixture = readFileSync(
  new URL("./fixtures/fireservice-board.html", import.meta.url),
  "utf8",
);

function boardWithForestSection(content: string) {
  return `<div id="L1" class="tabcontent">${content}</div><div id="P1" class="tabcontent"></div>`;
}

const PLOMARI_ROW_WITH_DATE =
  "<td>Δ. ΛΕΣΒΟΥ - ΠΛΩΜΑΡΙΟΥ</td><td>ΕΝΑΡΞΗ <b>29/07/2026</b></td>";
const PLOMARI_ROW_WITHOUT_DATE =
  "<td>Δ. ΛΕΣΒΟΥ - ΠΛΩΜΑΡΙΟΥ</td><td></td><td></td>";

test("parses the Plomari row from a real board snapshot", () => {
  expect(parseFireServiceBoard(fixture)).toEqual({
    status: "in-progress",
    statusLabel: "IN PROGRESS",
    municipality: "Lesvos · Plomari",
    incidentType: "Wildfire incident",
    sourceAge: "24 λεπτα",
  });
});

test("maps a different status container and tolerates a missing age", () => {
  const html = boardWithForestSection(
    "ΛΗΞΗ (1)" +
    '<div class="bg-info"><div class="panel-heading"><table><tr>' +
    PLOMARI_ROW_WITHOUT_DATE +
    "</tr></table></div></div>",
  );

  expect(parseFireServiceBoard(html)).toEqual({
    status: "ended",
    statusLabel: "ENDED",
    municipality: "Lesvos · Plomari",
    incidentType: "Wildfire incident",
    sourceAge: null,
  });
});

test("does not borrow a neighboring incident's update age", () => {
  const html = boardWithForestSection(
    "ΣΕ ΕΞΕΛΙΞΗ (2)" +
    '<div class="panel panel-red"><div class="panel-heading"><table><tr>' +
    PLOMARI_ROW_WITH_DATE +
    "</tr></table></div></div>" +
    '<div class="panel panel-red"><div class="panel-heading"><table><tr>' +
    "<td>Δ. ΣΗΤΕΙΑΣ - ΛΕΥΚΗΣ</td>" +
    "</tr></table>Τελευταία Ενημέρωση πριν από 5 λεπτά</div></div>",
  );

  expect(parseFireServiceBoard(html).sourceAge).toBeNull();
});

test("parses day-based update ages inside the target container", () => {
  const html = boardWithForestSection(
    "ΜΕΡΙΚΟΣ ΕΛΕΓΧΟΣ (1)" +
    '<div class="panel panel-yellow"><div class="panel-heading"><table><tr>' +
    PLOMARI_ROW_WITH_DATE +
    "</tr></table>Τελευταία Ενημέρωση πριν από 1 ημέρα</div></div>",
  );

  expect(parseFireServiceBoard(html).sourceAge).toBe("1 ημερα");
});

test("rejects conflicting section and container statuses", () => {
  const html = boardWithForestSection(
    "ΜΕΡΙΚΟΣ ΕΛΕΓΧΟΣ (1)" +
    '<div class="panel panel-red"><div class="panel-heading"><table><tr>' +
    PLOMARI_ROW_WITH_DATE +
    "</tr></table></div></div>",
  );

  expect(() => parseFireServiceBoard(html)).toThrow(
    /Plomari status not parsed/,
  );
});

test("throws when the Plomari row is missing so the source degrades to error", () => {
  expect(() =>
    parseFireServiceBoard(boardWithForestSection("unrelated page")),
  ).toThrow(/Plomari row not found/);
});

test("throws when the Plomari row is outside a status container", () => {
  expect(() =>
    parseFireServiceBoard(
      boardWithForestSection(PLOMARI_ROW_WITH_DATE),
    ),
  ).toThrow(/Plomari incident signature not unique/);
});

test("ignores a matching municipality in a non-wildfire board section", () => {
  const urbanIncident =
    "ΣΕ ΕΞΕΛΙΞΗ (1)" +
    '<div class="panel panel-red"><div class="panel-heading"><table><tr>' +
    PLOMARI_ROW_WITH_DATE +
    "</tr></table></div></div>";
  const html =
    '<div id="L1" class="tabcontent">ΣΕ ΕΞΕΛΙΞΗ (0)</div>' +
    `<div id="P1" class="tabcontent">${urbanIncident}</div>`;

  expect(() => parseFireServiceBoard(html)).toThrow(/Plomari row not found/);
});

test("rejects ambiguous duplicate matches instead of guessing", () => {
  const incident =
    '<div class="panel panel-red"><div class="panel-heading"><table><tr>' +
    PLOMARI_ROW_WITH_DATE +
    "</tr></table></div></div>";

  expect(() =>
    parseFireServiceBoard(
      boardWithForestSection(`ΣΕ ΕΞΕΛΙΞΗ (2)${incident}${incident}`),
    ),
  ).toThrow(/Plomari incident signature not unique/);
});

test("rejects ambiguous ended rows when the board omits their dates", () => {
  const incident =
    '<div class="bg-info"><div class="panel-heading"><table><tr>' +
    PLOMARI_ROW_WITHOUT_DATE +
    "</tr></table></div></div>";

  expect(() =>
    parseFireServiceBoard(
      boardWithForestSection(`ΛΗΞΗ (2)${incident}${incident}`),
    ),
  ).toThrow(/Plomari incident signature not unique/);
});

test("replaces invalid numeric entities without throwing", () => {
  expect(plainText("age &#999999999999; unknown")).toBe("age � unknown");
});
