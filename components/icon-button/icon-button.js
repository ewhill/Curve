const ICON_BUTTON_LOADING_CLASS = 'loading';

class IconButton extends Component {
  constructor() {
    super();

    this.buttonEl_ = null;
    this.buttonElOriginalDisplay_ = 'block';
    this.imageEl_ = null;
  }

  onLoad() {
    this.buttonEl.classList.add(ICON_BUTTON_LOADING_CLASS);

    this.imageEl.onload = () => { this.onImageLoad() };
    this.imageEl.onerror = (e) => { this.onImageError(e) };

  	this.imageEl.src = 
  		`/components/icon-button/icons/${this.icon}.png`;
  }

  onImageLoad() {
    this.buttonEl.classList.remove(ICON_BUTTON_LOADING_CLASS);
  }

  onImageError(e) {
    console.error(e);
  }

  // Called when any `slot` children are changed
  onSlotChange(e) {
    console.log(e);
  }

  get buttonEl() {
    if(this.buttonEl_) return this.buttonEl_;
    this.buttonEl_ = this.shadowRoot.querySelector(`button`);
    return this.buttonEl_;
  }

  get icon() {
  	if(this.hasAttribute('icon')) {
  		return this.getAttribute('icon');
  	} else {
  		return null;
  	}
  }

  get imageEl() {
  	if(this.imageEl_) return this.imageEl_;
  	this.imageEl_ = this.shadowRoot.querySelector(`img#icon`);
  	return this.imageEl_;
  }

  get loadingEl() {
    if(this.loadingEl_) return this.loadingEl_;
    this.loadingEl_ = this.shadowRoot.querySelector(`div#loading`);
    return this.loadingEl_;
  }
}

window.customElements.define('icon-button', IconButton);