class MenuItemController {
	constructor() {}

	onItemClick(event, from) {
		const menuItemClickEvent = new CustomEvent('menuitemclick', 
			{bubbles: true, detail: { item: from, originalEvent: event}});
		from.dispatchEvent(menuItemClickEvent);
		return false;
	}
}

window.customControllers.define(MenuItemController);