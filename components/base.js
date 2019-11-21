const CALLEE_ERROR_STACK_REGEX = /at\snew\s([^\s]+)\s\(((?:.*).js)/i;

class Component extends HTMLElement {
  constructor(paths) {
    super();

    this.callee_ = null;
    this.closestControllerEl_ = null;
    this.disposableEvents_ = [];
    this.dynamics_ = {
      attributes: {},
      interpolations: {}
    };
    this.template_ = {};

    this.load_(paths);
  }

  /**
   * Create a proxy which will be used to 'spy' on the owning 
   * element's controller methods called by dynamic event listeners.
   * 
   * @param  {HTMLElement} owningElement 
   *         The element with controller to proxy.
   */
  createEventInvocationProxy_(owningElement) {
    return new Proxy({}, {
      get: (target, prop) => owningElement.controller_[prop],
      set: (target, prop, value) => {
        // No block on set of the controller d property.
        owningElement.controller_[prop] = value;

        const thisDynamicAttributes = 
          this.dynamics_.attributes;

        const ownerDynamicInterpolations = 
          owningElement.dynamics_.interpolations;

        if(thisDynamicAttributes.hasOwnProperty(prop)) {
          this.setAttribute(thisDynamicAttributes[prop], value);
        }

        if(ownerDynamicInterpolations.hasOwnProperty(prop)) {
          for(let element of ownerDynamicInterpolations[prop]) {
            // TODO: There's probably a more idealistic way to 
            // achieve this rather than reseting to original template 
            // and interpolating.
            element.innerHTML = element.goldenHTML;
            owningElement.interpolate_(element);
          }
        }

        // MUST return true.
        return true;
      }
    });
  }

  /**
   * Fetches both HTML and CSS templates for this component.
   * 
   * @param {Object} paths  
   *        The paths of the HTML and CSS to fetch.
   * @return {Object}  
   *         Object containing HTML and CSS as text strings.
   */
  async fetchTemplate_(paths) {
    if(this.template_ && this.template_.html) {
      return Promise.resolve(this.template_);
    }

    let htmlHref = null;
    let cssHref = null;

    if(paths) {
      htmlHref = paths.html;
      cssHref = paths.css;
    } else {
      const calleePath = this.callee.path.split('.js')[0];
      htmlHref = `${calleePath}.html`;
      cssHref = `${calleePath}.css`;
    }

    const fetchResults = await Promise.all([
        htmlHref ? this.fetchTemplateFromUrl_(cssHref) : 
          Promise.resolve(""),
        cssHref ? this.fetchTemplateFromUrl_(htmlHref) : 
          Promise.resolve("")
      ]);

    [ this.template_.css, this.template_.html ] = fetchResults;

    return { html: this.template_.html, css: this.template_.css };
  }

  /**
   * Performs a fetch for the given url and returns the result text.
   * 
   * @param  {string} path  
   *         The path to fetch.
   * @return {string}  
   *         The fetch result as text. 
   */
  async fetchTemplateFromUrl_(path) {
    let result;

    try {
      result = await fetch(path);
    } catch(e) {
      throw new Error(`No template found for component at ` + 
        `'${path}'.`);
    }

    if(result.status === 200) {
      return await result.text();
    } else {
      throw new Error(`Fetch response status was not OK for ${path}`);
    }
  }

  /**
   * Finds all ancestor elements with controllers and waits for each 
   * found ancestor's controller to be ready before adding to the 
   * results.
   * 
   * @param  {HTMLElement} element  
   *         The element from where to start the DOM traversal. If 
   *         not provided, the value will default to this element.
   * @param  {Array<HTMLElement>} results  
   *         Do not set manually. This is the array to hold found 
   *         elements, used for recusion.
   * @return {Array<HTMLElements>}  
   *         The list of found elements.
   */
  async findAllAncestorControllerElements_(element = this, results = []) {
    const closest = 
      await this.findClosestControllerElementFrom_(element);

    if(closest) {
      // Find next element with controller from current closest.
      return this.findAllAncestorControllerElements_(
        closest.parentNode, results.concat([closest]));
    } else {
      return results;
    }
  }

  /**
   * Finds the next element which has a controller from the given 
   * element by traversing up the DOM tree and ensures the found 
   * element's controller is ready before returning.
   * 
   * @param {HTMLElement} element  
   *        The element from where to start the DOM traversal. If not 
   *        provided, the value will default to this element.
   * @return {Element|null}  The element, or null if not found.
   */
  findClosestControllerElementFrom_(element = this) {
    if(element instanceof HTMLElement && 
      element !== document.documentElement) {
        const controllerAttributes = 
          Array.from(element.attributes)
            .filter(({ name }) => /\[controller\]/i.test(name));

        if(controllerAttributes.length > 0) {
          return this.waitForElementController(element);
        } else {
          return this.findClosestControllerElementFrom_(
            element.parentNode);
        }
    } else {
      return null;
    }
  }

  /**
   * Performs a BFS to find all elements in the DOM subtree from the 
   * given element down with template syntax present (e.g. `{{var}}`).
   *  
   * @param  {HTMLElement} el 
   *         The element from where to start our BFS DOM traversal.
   * @param  {Array}  results  
   *         Do not set manually. This is the results array used in 
   *         recursion which is appended to when a matching element 
   *         is found. 
   * @return {Array<HTMLElements>}  
   *         The array of found elements.
   */
  findDeepestElementsToBeInterpolated_(el=this, results=[]) {
    if(!/\{\{.*\}\}/im.test(el.innerText)) return [];

    const resultsLengthBefore = results.length;
    let childInterpolations = [];

    for(let child of el.childNodes) {
      childInterpolations = childInterpolations.concat(
        this.findDeepestElementsToBeInterpolated_(child, results));
    }

    if(childInterpolations.length === 0) {
      results.push(el);
    }

    return results;
  }

  /**
   * Sets up dynamic attributes and event proxy handlers for the 
   * component based on the attributes on the HTMLElement.
   */
  async initializeDynamics_() {
    this.closestControllerEl_ = 
      await this.findClosestControllerElementFrom_();

    for(let attribute of this.attributes) {
      let { name, value } = attribute;

      if(/\[controller\]/i.test(name)) continue;

      if(/\[.*\]/i.test(name)) {
        name = name.slice(1, name.length - 1);

        const controllerPropValue = 
          this.closestControllerEl_.controller_[value];

        if(typeof controllerPropValue !== 'undefined') {
          /*
           * Set the dynamic attribute (with name given by the 
           * attribute name minus brackets) to the value of the 
           * owning controller's respective property (with property 
           * name given by the attribute value string).
           *
           * For instance, "<div [disabled]='isDisabled'></div>" 
           * sets the attribute 'disabled' to the value of the 
           * property 'isDisabled' as defined or provided by the 
           * nearest ancestor controller (if any).
           */
          this.setAttribute(name, 
            this.controller_[controllerPropValue]);
        }

        /*
         * Track this attribute for dynamic update later, when the 
         * value may change as a result of an event callback.
         */
        this.dynamics_.attributes[value] = name;
      } else if(/\(.*\)/i.test(name)) {
        name = name.slice(1, name.length - 1);

        const controllerPropValue = 
          this.closestControllerEl_.controller_[value];

        if(typeof controllerPropValue === 'function') {
          /* 
           * Add disposable event listener with proxy to owning 
           * controller for the given attribute name.
           * 
           * For instance, "<div (click)='handleClick'></div>" 
           * registers the event with the attribute's name, in this 
           * case 'click', and sets the callback to be the method 
           * with name 'handleClick' as owned by the nearest 
           * ancestor controller (if any).
           */
          let owner = this.closestControllerEl_;
          let proxy = this.createEventInvocationProxy_(owner);

          console.log(`Proxying event '${name}' to ` + 
            `'${owner.controllerClassName_}' method named ` + 
            `'${value}'`);

          this.addDisposableEventListener(this, name, function() {
              owner.controller_[value].apply(proxy, arguments);
            });
        } else {
          console.warn(new Error(`Property with name '${value}' ` + 
              `not found in ` + 
              `'${this.closestControllerEl_.callee.className}' ` + 
              `controller!`));
        }
      }
    }
  }

  /**
   * Attempt to perform a template interpolate on the passed element.
   * If no element is given, perform the template interpolation on 
   * the deepest elements with template syntax present.
   * 
   * @param  {HTMLElement} element 
   *         The element we wish to interpolate. If not given, the 
   *         interpolation will be performed on the deepest elements 
   *         with template syntax present.
   */
  async interpolate_(element) {
    if(element) {
      this.interpolations_ = [element];
    } else {
      this.interpolations_ = 
        this.findDeepestElementsToBeInterpolated_();
    }

    if(!this.ancestorControllerElements_) {
      this.ancestorControllerElements_ = 
        await this.findAllAncestorControllerElements_();
    }

    for(let interpolationElement of this.interpolations_) {
      interpolationElement.goldenHTML = 
        interpolationElement.innerHTML;

      interpolationElement.innerHTML = 
        interpolationElement.innerHTML.replace(/\{\{.*\}\}/i, 
          (match) => {
            return this.performInterpolationOf_(interpolationElement, 
                match.slice(2, match.length -2)); 
          });
    }
  }

  /**
   * Loads the component by loading the template, upgrading the 
   * component to Shadow DOM, setting the component controller (if 
   * given), initializing dynamic attributes, and interpolating the 
   * loaded component template.
   * 
   * @param  {Object} paths  
   *         An object containing html and css properties which point 
   *         to the html and css template paths, respectively.
   * @param  {Number} backoff  
   *         Do not set manually. The time in ms to wait before 
   *         trying again upon error when loading the template.
   */
  async load_(paths = null, backoff = 3333) {
    try {
      const { html, css } = await this.fetchTemplate_(paths);
      this.upgradeComponent_({ html, css });
    } catch(err) {
      setTimeout(() => {
        this.load_(paths, backoff*1.5);
      }, backoff);
      throw err;
    }

    const controllerAttributes = 
      Array.from(this.attributes)
        .filter(({ name }) => /\[controller\]/i.test(name))

    if(controllerAttributes.length > 0) {
      /*
       * Set this element's controller_ property a new
       * controller instance, created from class name as given by the 
       * attribute's value.
       */
      const controllerAttribute = controllerAttributes.slice(-1)[0];
      this.controllerClassName_ = controllerAttribute.value;
      this.controller_ = 
        new (window.customControllers[this.controllerClassName_])();
    }

    await this.initializeDynamics_()
    await this.interpolate_();
    
    if(typeof this.onLoad === 'function') {
      this.onLoad();
    }
  }

  /**
   * Attempt to interpolate the given name to a property of the same 
   * name owned by an ancestor controller of the given element.
   * 
   * @param  {HTMLElement} interpolationElement 
   *         The element from where to begin the DOM traversal, or 
   *         the element containing the interpolation for which to 
   *         search.
   * @param  {String} name  
   *         The template name of the interpolation to attempt. This 
   *         name will be used when searching ancestor controllers in 
   *         order to see where the property has been defined.
   * @return {String|undefined}  
   *         The replacement string if the interpolation was 
   *         successful, undefined if no mathcing property with the 
   *         given name was found in any ancestor controllers.
   */
  performInterpolationOf_(interpolationElement, name) {
    let warnTrace = "";

    for(let ancestorElement of this.ancestorControllerElements_) {
      const interpolations = ancestorElement.dynamics_.interpolations;

      if(!interpolations.hasOwnProperty(name)) {
        interpolations[name] = [interpolationElement];
      } else {
        if(interpolations[name].indexOf(interpolationElement) < 0) {
          interpolations[name].push(interpolationElement);
        }
      }

      if(ancestorElement.controller_.hasOwnProperty(name)) {
        return ancestorElement.controller_[name];
      } else {
        warnTrace = `... checking class ` + 
          `'${ancestorElement.callee.className}'\n\t${warnTrace}`;
      }
    }

    // Interpolation failed; property wasn't found. Warn, but do not
    // fail so as to not break app. Instead, return undefined.
    warnTrace = `Property '${name}' not found in nearest ` + 
      `available controller!\n\t${warnTrace}`;
    console.warn(warnTrace);
    return undefined;
  }

  /**
   * Upgrade the component to the given html and css and set up the 
   * Shadow DOM.
   * 
   * @param  {String} options.html  
   *         The raw HTML string to inject into the created template 
   *         element.
   * @param  {String} options.css  
   *         The raw CSS string to inject into the created template 
   *         element.
   */
  upgradeComponent_({ html, css }) {
    // Create template element, set content
    let templateEl = document.createElement('template');
    if(css) {
      html = `<style>\n${css}\n</style>` + html;
    }
    templateEl.innerHTML = html;

    // Create shadow root, add our template content
    this.attachShadow({mode: 'open'});
    this.shadowRoot.appendChild(templateEl.content.cloneNode(true));

    if(typeof this.onSlotChange === 'function') {
      // Set up the slots
      this.onSlotChange = this.onSlotChange.bind(this);
      this.shadowRoot.querySelectorAll('slot')
        .forEach(slot => {
          this.addDisposableEventListener(slot, 'slotchange', 
            this.onSlotChange);
        });
    }
  }

  /**
   * Wait until the given element's controller is instantiated.
   * 
   * @param  {HTMLElement} element 
   *         The element with controller to be checked for readiness.
   * @param  {Number} backoff 
   *         Do not set menually. This is the time in ms between 
   *         checks for the element's controller readiness 
   *         (time between recursion).
   * @return {Promise}  
   *         A promise that resolves when the given element's 
   *         controller is instantiated.
   */
  waitForElementController(element, backoff = 3333) {
    if(element.controller_) {
      return element;
    } else {
      console.warn(`Element controller attribute is present but ` + 
        `the controller does not appear to be ready; Waiting ` + 
        `${backoff}ms for the controller to be instantiated...`);

      const delay = new Promise((resolve) => {
          setTimeout(resolve, backoff);
        });

      return delay.then(() => {
        return this.waitForElementController(element, backoff*1.5);
      });
    }
  }

  /* ************************************************************** */
  /* ************************************************************** */
  /* ************************************************************** */
  /* ************************************************************** */

  connectedCallback() {
    if(typeof this.onConnected === 'function') {
      this.onConnected.apply(this, arguments);
    }
  }

  disconnectedCallback() {
    if(typeof this.onDisconnected === 'function') {
      this.onDisconnected.apply(this, arguments);
    }
    this.removeAllDisposableEventListeners();
  }

  /* ************************************************************** */
  /* ************************************************************** */
  /* ************************************************************** */
  /* ************************************************************** */

  get callee() {
    if(this.callee_) return this.callee_;

    const stack = (new Error()).stack.split("\n").map((line) => { 
        const matchResult = line.match(CALLEE_ERROR_STACK_REGEX);
        if(matchResult) {
          const [ , className, path ] = matchResult;
          return { className, path };
        } else {
          return null;
        }
      }).filter(Boolean);

    this.callee_ = stack[0];

    if(stack.length > 1) {
      for(let i=1; i<stack.length; i++) {
        if(stack[i].className !== this.callee_.className && 
          stack[i].path !== this.callee_.path) {
            this.callee_ = stack[i];
            break;
        }  
      }
    }

    return this.callee_;
  }

  /* ************************************************************** */
  /* ************************************************************** */
  /* ************************************************************** */
  /* ************************************************************** */

  /**
   * Adds a disposable event listener on the given element which will 
   * be discarded when this component is destroyed.
   * 
   * @param {HTMLElement} element 
   *        The element on which to register the event handler.
   * @param {String} event 
   *        The event name used in adding the event listener.
   * @param {Function} handler 
   *        The handler (callback) function to be called when the 
   *        event is triggered.
   */
  addDisposableEventListener(element, event, handler) {
    const self = this;
    const handlerWrapper = function() {
      handler.apply(self, [...arguments, this]);
    };

    element.addEventListener(event, handlerWrapper);
    this.disposableEvents_.push({ element, event, 
      handler: handlerWrapper });
  }

  /**
   * Removes a disposable event listener with the given properties.
   * 
   * @param {HTMLElement} element 
   *        The element on which to remove the event handler.
   * @param {String} event 
   *        The event name used in removing the event listener.
   * @param {Function} handler 
   *        The handler (callback) function to remove.
   */
  removeDisposableEventListener(element, event, handler) {
    const needle = JSON.stringify({ element, event, handler });

    for(let i=this.disposableEvents_.length - 1; i>=0; i--) {
      if(JSON.stringify(d) === needle) {
        element.removeEventListener(event, handler);
        this.disposableEvents_.splice(i, 1);
      }
    }
  }

  /**
   * Removes all disposable event listeners.
   */
  removeAllDisposableEventListeners() {
    for(let { element, event, handler } of this.disposableEvents_) {
      element.removeEventListener(event, handler);
    }
  }
}