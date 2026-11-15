const editor = document.querySelector(".post-content");
const highlight = document.querySelector(".post-highlight");

if (editor && highlight) {
  editor.value = [
    "Hello Guys,",
    "I would love to share a fine adventure trip in kashmir hope you guys like it",
    "#travel #time #tranding",
  ].join("\n");

  const updateHighlight = () => {
    const tags = /#[\p{L}\p{N}_]+/gu;
    const text = editor.value;
    let position = 0;
    let match;

    highlight.replaceChildren();

    while ((match = tags.exec(text))) {
      highlight.append(document.createTextNode(text.slice(position, match.index)));

      const tag = document.createElement("span");
      tag.className = "post-tag";
      tag.textContent = match[0];
      highlight.append(tag);

      position = match.index + match[0].length;
    }

    highlight.append(document.createTextNode(text.slice(position)));
    highlight.scrollTop = editor.scrollTop;
  };

  editor.addEventListener("input", updateHighlight);
  editor.addEventListener("scroll", () => {
    highlight.scrollTop = editor.scrollTop;
  });

  updateHighlight();
}
