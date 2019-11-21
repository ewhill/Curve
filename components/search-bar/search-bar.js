class SearchBar extends Component {
  constructor() {
    super();

    this.inputEl_ = null;
  }

  get inputEl() {
    if(this.inputEl_) return this.inputEl_;
    this.inputEl_ = this.shadowRoot.querySelector('input');
    return this.inputEl_;
  }

  get value() {
    return this.inputEl.value;
  }
}

window.customElements.define('search-bar', SearchBar);