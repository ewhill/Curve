class MenuItem extends Component {
  constructor() {
    super();

    this.anchorEl_ = null;
    this.dividerAttribute_ = false;
    this.noClickAttribute_ = false;
    this.noHoverAttribute_ = false;
  }

  onLoad() {
    if(this.dividerAttribute) {
      this.anchorEl.setAttribute("divider", "true");
    } else {
      if(this.noClickAttribute) {
        this.anchorEl.setAttribute("noclick", "true");
      }

      if(this.noHoverAttribute) {
        this.anchorEl.setAttribute("nohover", "true");
      }
    }
  }

  get anchorEl() {
    if(this.anchorEl_) return this.anchorEl_;
    this.anchorEl_ = this.shadowRoot.querySelector(`a#link`);
    return this.anchorEl_;
  }

  get dividerAttribute() {
    if(this.dividerAttribute_) return this.dividerAttribute_;
    this.dividerAttribute_ = this.hasAttribute('divider');
    return this.dividerAttribute_;
  }

  get noClickAttribute() {
    if(this.noClickAttribute_) return this.noClickAttribute_;
    this.noClickAttribute_ = this.hasAttribute('noclick');
    return this.noClickAttribute_;
  }

  get noHoverAttribute() {
    if(this.noHoverAttribute_) return this.noHoverAttribute_;
    this.noHoverAttribute_ = this.hasAttribute('nohover');
    return this.noHoverAttribute_;
  }
}

window.customElements.define('menu-item', MenuItem);