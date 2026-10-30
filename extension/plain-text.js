// Canonical plain-text contract for Treehouse's editor adapters.
// Read-only structural reconstruction; does not interpret HTML or execute messages.
globalThis.TreehousePlainText = (() => {
  const canonical = value => value.replace(/\r\n?/g, "\n").normalize("NFC");
  function fromEditor(editor) {
    if (editor.matches("textarea, input")) return canonical(editor.value);
    const blocks = new Set(["P", "DIV", "LI"]);
    // Convert DOM text nodes and explicit block boundaries to plain text.
    // Preserves empty paragraphs. No innerText layout-generated blank lines.
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      if (node.tagName === "BR") return "\n";
      const pieces = [];
      for (const child of node.childNodes) {
        if (child.nodeType === Node.ELEMENT_NODE && blocks.has(child.tagName))
          pieces.push({ block: true, text: walk(child) });
        else pieces.push({ block: false, text: walk(child) });
      }
      let value = "";
      let previousBlock = false;
      for (const piece of pieces) {
        if ((piece.block || previousBlock) && value && !value.endsWith("\n"))
          value += "\n";
        else if ((piece.block || previousBlock) && previousBlock && value.endsWith("\n") && piece.text === "")
          value += "\n";
        value += piece.text;
        previousBlock = piece.block;
      }
      return value;
    }
    return canonical(walk(editor));
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
