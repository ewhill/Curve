class AppBarTitle extends Component {
  constructor() {
    super();

    this.subtitleLinkEl_ = null;
    this.titleLinkEl_ = null;
  }

  onLoad() {
    const subtitleHref = this.getAttribute('subtitlehref');
    const titleHref = this.getAttribute('titlehref');

    if(this.alignAttribute) {
      this.titleContainerEl.setAttribute('align', this.alignAttribute);
    }

    if(subtitleHref) {
      this.titleLinkEl.href = subtitleHref;
    }

    if(titleHref) {
      this.titleLinkEl.href = titleHref;
    }
  }

  get alignAttribute() {
    if(this.alignAttribute_) return this.alignAttribute_;
    this.alignAttribute_ = this.getAttribute('align');
    return this.alignAttribute_;
  }

  get titleContainerEl() {
    if(this.titleContainerEl_) return this.titleContainerEl_;
    this.titleContainerEl_ = this.shadowRoot.querySelector(`div#titleContainer`);
    return this.titleContainerEl_;
  }

  get subtitleLinkEl() {
    if(this.subtitleLinkEl_) return this.subtitleLinkEl_;
    this.subtitleLinkEl_ = this.shadowRoot.querySelector(`a#subtitle`);
    return this.subtitleLinkEl_;
  }

  get titleLinkEl() {
    if(this.titleLinkEl_) return this.titleLinkEl_;
    this.titleLinkEl_ = this.shadowRoot.querySelector(`a#title`);
    return this.titleLinkEl_;
  }
}

window.customElements.define('app-bar-title', AppBarTitle);