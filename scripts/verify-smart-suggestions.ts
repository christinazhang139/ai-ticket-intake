import { verifySmartSuggestionTests } from "../src/lib/smart-suggestions";

const { ok, errors } = verifySmartSuggestionTests();
if (!ok) {
  console.error("Smart suggestion self-tests failed:\n", errors.join("\n"));
  process.exit(1);
}
console.log("Smart suggestion self-tests passed.");
