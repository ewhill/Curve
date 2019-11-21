
class CustomControllers {
	constructor() {
		this.controllers_ = {};
	}

	define(classValue) {
		const className = `${classValue}`.match(/class\s([^\s]+)/)[1];
		window.customControllers[className] = classValue;
	}

	valueOf() {
		return this.controllers_;
	}
}

window.customControllers = new CustomControllers();