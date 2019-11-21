class AppBar extends Component {
  constructor() {
    super();
  }

  // Called when any `slot` children are changed
  onSlotChange(slotEl, event) {
    console.log(event);
  }
}

window.customElements.define('app-bar', AppBar);