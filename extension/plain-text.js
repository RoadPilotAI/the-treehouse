// Canonical plain-text contract for Treehouse's editor adapters.
// Read-only structural reconstruction; does not interpret HTML or execute messages.
globalThis.TreehousePlainText = (() => {
  const canonical = value => value.replace(/\r\n?/g, "\n").normalize("NFC");
  function fromEditor(editor) {
    if (editor.matches("textarea, input")) return canonical(editor.value);
    const lines = [];
    const blockTags = new Set(["P", "DIV", "LI"]);
    function visit(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      if (node.tagName === "BR") return "\n";
      let output = "";
      for (const child of node.childNodes) {
        const fragment = visit(child);
        if (child.nodeType === Node.ELEMENT_NODE && blockTags.has(child.tagName) &&
            output && !output.endsWith("\n")) output += "\n";
        output += fragment;
      }
      return output;
    }
    // The editor's actual DOM structure, not innerText's layout heuristics.
    return canonical(visit(editor));
  }
  const diagnose = (expected, observed) => ({
    expectedLength: expected.length, observedLength: observed.length,
    expectedLines: expected.split("\n").length, observedLines: observed.split("\n").length,
    firstDifferenceAt: (() => {
      let i = 0; while (i < Math.min(expected.length, observed.length) && expected[i] === observed[i]) i++;
      return i;
    })()
  });
  return Object.freeze({ canonical, fromEditor, diagnose });
})();
