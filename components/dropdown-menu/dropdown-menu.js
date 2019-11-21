const REPOSITION_DEBOUNCER_TIMEOUT_MS = 25;

class DropdownMenu extends Component {
  constructor() {
    super();

    this.activeUnderlay_ = null;
    this.anchorEl_ = null;
    this.isOpen_ = false;
    this.repositionDebouncer_ = null;
    this.underlayEl_ = null;
  }

  onLoad() {
    this.addDisposableEventListener(this.anchorEl, 'click', this.toggleMenu);
    this.addDisposableEventListener(this.underlayEl, 'click', this.toggleMenu);
    this.addDisposableEventListener(window, 'resize', this.onWindowResize);
  }

  toggleMenu(event, anchorElement) {
    if(this.isOpen_) {
      this.closeMenu();
    } else {
      this.openMenu();
      this.reposition();
    }
  }

  onWindowResize() {
    if(this.repositionDebouncer_) clearTimeout(this.repositionDebouncer_);

    if(this.isOpen_) {
      this.repositionDebouncer_ = setTimeout(() => {
          const computedStyle = window.getComputedStyle(this, null);
          if(computedStyle.display === 'none') {
            this.closeMenu();
          } else {
            this.reposition();
          }
        }, REPOSITION_DEBOUNCER_TIMEOUT_MS);
    }
  }

  reposition() {
    const anchorBounds = this.anchorEl.getBoundingClientRect();
    const bodyBounds = document.body.getBoundingClientRect();
    const menuBounds = this.menuEl.getBoundingClientRect();

    let left = anchorBounds.left + (anchorBounds.width / 2) - (menuBounds.width / 2);
    let top = anchorBounds.bottom + 8;

    left = Math.min(left, bodyBounds.width - menuBounds.width);
    left = Math.max(left, 0);

    top = Math.min(top, bodyBounds.height - menuBounds.height);
    top = Math.max(top, 0);

    this.menuEl.style.left = `${(left + window.scrollX)}px`;
    this.menuEl.style.top = `${(top + window.scrollY)}px`;
  }

  closeMenu() {
    this.underlayEl.style.display = 'none';
    this.menuEl.style.display = 'none';
    this.isOpen_ = false;
  }

  openMenu() {
    this.underlayEl.style.display = 'block';
    this.menuEl.style.display = 'block';
    this.isOpen_ = true;
  }

  get underlayEl() {
    if(this.underlayEl_) return this.underlayEl_;
    this.underlayEl_ = this.shadowRoot.querySelector(`#underlay`);
    return this.underlayEl_;
  }

  get anchorEl() {
    if(this.anchorEl_) return this.anchorEl_;
    this.anchorEl_ = this.querySelector(`[slot="anchor"]`);
    return this.anchorEl_;
  }

  get menuEl() {
    if(this.menuEl_) return this.menuEl_;
    this.menuEl_ = this.querySelector(`[slot="menu"]`);
    return this.menuEl_;
  }
}

window.customElements.define('dropdown-menu', DropdownMenu);