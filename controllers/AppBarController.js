class AppBarController {
	constructor() {
		this.title = "MySuperAwesomeApp";
		this.titleFlip = true;

		this.userName = "";
		this.userEmail = ""
	}

	onMenuItemClicked(event, from) {
		console.log(`App Bar caught charm click!`);
		console.log(`Item: `, event.detail.item);
		console.log(`Original Event: `, event.detail.originalEvent);

		this.subtitle = event.detail.item.innerText;

		if(this.titleFlip) {
			this.title = "Foo";
		} else {
			this.title = "Bar";
		}
		this.titleFlip = !this.titleFlip;

		return false;
	}

	onKeyUp(event, from) {
		this.title = element.value;
	}
}

window.customControllers.define(AppBarController);