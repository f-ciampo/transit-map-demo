class Autocomplete {
  constructor(
    container,
    getSuggestions,
    onAccept,
    defaultHint,
    delay = 300
  ) {
    this.container = container;
    this.getSuggestions = getSuggestions;
    this.onAccept = onAccept;

    this.suggestions = [];
    this.selectingIndex = -1;

    this.inputElement = document.createElement("input");
    this.inputElement.autocomplete = "off";

    this.listElement = document.createElement("div");
    this.listElement.className = "suggestions";
    this.listElement.hidden = true;

    this.container.appendChild(this.inputElement);
    this.container.appendChild(this.listElement);

    this.delay = delay;
    this.completeTimeout = null;

    this.defaultHint = defaultHint;
    this.inputElement.placeholder = defaultHint;

    this.loading = false;

    this.bindEvents();
  }

  bindEvents() {
    this.inputElement.addEventListener("input", () => {
      clearTimeout(this.completeTimeout);

      this.loading = true;
      this.renderSuggestions();

      this.completeTimeout = setTimeout(() => {
        this.completeText();
      }, this.delay);
    });

    this.inputElement.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") {
        e.preventDefault();

        this.selectingIndex =
          Math.min(this.selectingIndex + 1, this.suggestions.length - 1);

        this.renderSuggestions();
      }

      else if (e.key === "ArrowUp") {
        e.preventDefault();

        this.selectingIndex = Math.max(this.selectingIndex - 1, 0);

        this.renderSuggestions();
      }

      else if (e.key === "Enter") {
        e.preventDefault();

        if (this.selectingIndex >= 0) {
          this.accept(
            this.suggestions[this.selectingIndex]
          );
        } else if (this.suggestions.length) {
          this.accept(this.suggestions[0]);
        }
      }

      else if (e.key === "Tab") {
        if (this.suggestions.length) {
          e.preventDefault();

          const completion = this.selectingIndex >= 0 ?
            this.suggestions[this.selectingIndex] :
            this.suggestions[0];

          this.inputElement.value = completion.text + completion.afterText;

          this.completeText();
        }
      }

      else if (e.key === "Escape") {
        this.inputElement.blur();
        this.listElement.hidden = true;
      }
    });

    document.addEventListener("click", e => {
      if (!e.target.closest(".autocomplete")) {
        this.listElement.hidden = true;
      }
    });

    this.inputElement.addEventListener("focus", () => {
      this.completeText();
    });
  }

  async completeText() {
    this.suggestions =
      await this.getSuggestions(this.inputElement.value) || [];

    this.loading = false;

    this.selectingIndex = -1;

    this.renderSuggestions();
  }

  renderSuggestions() {
    this.listElement.innerHTML = "";
    if (!this.inputElement.value.length) return;

    if (!this.suggestions.length) {
      const div = document.createElement("div");

      div.className = "suggestion text-muted";
      div.textContent = this.loading ? "Buscando..." : "Sin resultados";

      this.listElement.appendChild(div);
      this.listElement.hidden = false;

      return;
    }

    this.suggestions.forEach((suggestion, i) => {
      const { item, text, afterText } = suggestion;
      const div = document.createElement("div");

      div.className =
        "suggestion" + (i === this.selectingIndex ? " selecting" : "");

      const main = document.createElement("span");
      main.textContent = text;

      const after = document.createElement("span");
      after.textContent = afterText;
      after.className = "text-muted";

      div.appendChild(main);
      div.appendChild(after);

      div.onclick = () => this.accept(suggestion);

      if (i === this.selectingIndex) {
        requestAnimationFrame(() => {
          div.scrollIntoView({
            block: "nearest"
          });
        });
      }

      this.listElement.appendChild(div);
    });

    this.listElement.hidden = false;
  }

  accept(value) {
    //this.inputElement.value = value.text;
    this.inputElement.value = "";
    this.inputElement.placeholder = this.defaultHint;

    this.suggestions = [];
    this.selectingIndex = -1;

    this.renderSuggestions();

    this.onAccept?.(value);
  }

  setHint(newHint = this.defaultHint) {
    this.inputElement.placeholder = newHint;
    this.renderSuggestions();
  }
}
