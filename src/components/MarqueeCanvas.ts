import { MarqueeController, MarqueeOptions } from './MarqueeController'
import { resizeObserver, debounce } from '@/utils'


// Custom Web Component Class

/**
 * Custom HTML element for declarative marquee usage
 *
 * This class implements a custom HTML element that can be used
 * directly in HTML markup to create marquee animations without
 * any JavaScript configuration.
 *
 * @extends HTMLElement
 *
 * @example
 * <!-- Usage in HTML -->
 * <marquee-canvas
 *   phrase="Hello World"
 *   font="bold 5rem Arial"
 *   speed="3"
 *   reverse
 * ></marquee-canvas>
 */
export default class MarqueeCanvas extends HTMLElement {
  // Private Properties

  /** The marquee controller instance managing the animation */
  private controller: MarqueeController | null = null
  /** The canvas element used for rendering */
  private canvas: HTMLCanvasElement | null = null
  /** Resize observer for responsive behavior */
  private resizeObserver: ResizeObserver | null = null

  // Static Properties

  /**
   * Array of attribute names to observe for changes
   *
   * When any of these attributes change, the attributeChangedCallback
   * will be triggered and the marquee will update accordingly.
   *
   * @static
   * @returns {string[]} Array of observed attribute names
   */
  static get observedAttributes(): string[] {
    return [
      'phrase',     // The text content to display
      'speed',      // Animation speed (pixels per frame)
      'reverse',    // Animation direction
      'color',      // Text color
      'font',       // CSS font property
      'padding-x',  // Horizontal padding
      'padding-y'   // Vertical padding
    ]
  }

  // Static Methods

  /**
   * Registers the custom element with the browser
   *
   * This method must be called before the custom element can be used
   * in HTML markup. It registers the element with the custom elements registry.
   *
   * @static
   * @param {string} [tag='marquee-canvas'] - The custom element tag name
   *
   * @example
   * // Register with default tag name
   * MarqueeCanvas.register()
   *
   * // Register with custom tag name
   * MarqueeCanvas.register('text-marquee')
   */
  static register(tag: string = 'marquee-canvas'): void {
    // Check if custom elements are supported and element isn't already registered
    if ('customElements' in window && !customElements.get(tag)) {
      customElements.define(tag, MarqueeCanvas)
    }
  }

  // Constructor

  /**
   * Creates a new MarqueeCanvas custom element
   *
   * @constructor
   */
  constructor() {
    super()
  }

  // Custom Element Lifecycle Methods

  /**
   * Called when the element is added to the DOM
   *
   * This lifecycle method is invoked when the element is connected
   * to the document and is the appropriate time to set up the
   * element's functionality.
   */
  connectedCallback(): void {
    this.initializeComponent()
  }

  /**
   * Called when the element is removed from the DOM
   *
   * This lifecycle method is invoked when the element is disconnected
   * from the document and is the appropriate time to clean up
   * resources to prevent memory leaks.
   */
  disconnectedCallback(): void {
    this.cleanup()
  }

  /**
   * Called when observed attributes change
   *
   * This lifecycle method is invoked when any of the attributes
   * listed in observedAttributes are added, removed, or changed.
   *
   * @param {string} name - The name of the attribute that changed
   * @param {string} oldValue - The previous value of the attribute
   * @param {string} newValue - The new value of the attribute
   */
  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    // Ignore if the value didn't actually change or controller isn't ready
    if (oldValue === newValue || !this.controller) return

    // Update the controller based on which attribute changed
    switch (name) {
      case 'phrase':
      case 'speed':
      case 'reverse':
      case 'color':
      case 'font':
      case 'padding-x':
      case 'padding-y':
        this.updateController()
        break
    }
  }

  // Private Methods - Component Setup

  /**
   * Initializes the custom element component
   *
   * This method sets up all the necessary parts of the component:
   * - Creates and appends the canvas element
   * - Sets up CSS styles
   * - Configures event listeners
   * - Initializes the marquee controller
   * - Sets up resize observation
   *
   * @private
   */
  private initializeComponent(): void {
    this.createCanvas()
    this.setupStyles()
    this.setupEventListeners()
    this.initializeController().catch(console.error)
    this.setupResizeObserver()
  }

  /**
   * Creates and appends the canvas element
   *
   * This method creates the canvas element that will be used
   * for rendering the marquee animation and adds it to the
   * custom element's DOM.
   *
   * @private
   */
  private createCanvas(): void {
    this.canvas = document.createElement('canvas')
    this.canvas.setAttribute('data-marquee', '')
    this.appendChild(this.canvas)
  }

  /**
   * Sets up CSS styles for the component and canvas
   *
   * This method ensures the component and its canvas are
   * properly styled for responsive behavior and correct display.
   *
   * @private
   */
  private setupStyles(): void {
    if (!this.canvas) return

    // Component container styling
    this.style.display = 'flex'
    this.style.overflow = 'hidden'
    this.style.width = '100%'
  }

  /**
   * Sets up event listeners for user interaction
   *
   * This method configures mouse event listeners to provide
   * interactive features like pausing on hover.
   *
   * @private
   */
  private setupEventListeners(): void {
    if (!this.canvas) return

    // Pause animation when mouse enters the canvas
    this.canvas.addEventListener('mouseenter', () => {
      this.canvas?.classList.add('paused')
    })

    // Resume animation when mouse leaves the canvas
    this.canvas.addEventListener('mouseleave', () => {
      this.canvas?.classList.remove('paused')
    })
  }

  /**
   * Initializes the marquee controller with current attribute values
   *
   * This method reads the custom element's attributes and uses them
   * to configure and initialize the marquee controller.
   *
   * @private
   * @async
   * @returns {Promise<void>}
   */
  private async initializeController(): Promise<void> {
    if (!this.canvas) return;

    // Build configuration object from element attributes
    const options: Partial<MarqueeOptions> = {
      text: this.getPhraseText(),
      font: this.getAttribute('font') || 'bold 5rem sans-serif',
      textColor: this.getAttribute('color') ||'#337baa',
      reverse: this.hasAttribute('reverse'),
      speed: parseInt(this.getAttribute('speed') || '2'),
      paddingX: parseInt(this.getAttribute('padding-x') || '0'),
      paddingY: parseInt(this.getAttribute('padding-y') || '36')
    }

    // Initialize the marquee controller
    this.controller = MarqueeController.init(this.canvas, options)
  }

  /**
   * Updates the controller with current attribute values
   *
   * This method is called when observed attributes change
   * and updates the marquee controller with the new values.
   *
   * @private
   */
  private updateController(): void {
    if (!this.controller) return

    // Update controller with current attribute values
    this.controller.update({
      text: this.getPhraseText(),
      font: this.getAttribute('font') || 'bold 5rem sans-serif',
      textColor: this.getAttribute('color') || '#f3bb0b',
      reverse: this.hasAttribute('reverse'),
      speed: parseInt(this.getAttribute('speed') || '2'),
      paddingX: parseInt(this.getAttribute('padding-x') || '0'),
      paddingY: parseInt(this.getAttribute('padding-y') || '36')
    })
  }

  /**
   * Builds the formatted phrase text from the phrase attribute
   *
   * This method processes the phrase attribute and formats it
   * appropriately for the marquee display, including adding
   * decorative elements and applying uppercase transformation.
   *
   * @private
   * @returns {string} The formatted phrase text for the marquee
   */
  private getPhraseText(): string {
    const phrase = this.getAttribute('phrase') || ''
    const reverse = this.hasAttribute('reverse')
    const uppercase = this.hasAttribute('uppercase')

    // Format the text with decorative elements
    const text = reverse ? `*  ${phrase}  ` : `  ${phrase}  *`

    return uppercase
      ? text.toUpperCase()
      : text
  }

  /**
   * Sets up resize observer for responsive behavior
   *
   * This method creates a resize observer that watches for
   * size changes in the custom element and triggers the
   * controller's resize handling when needed.
   *
   * @private
   */
  private setupResizeObserver(): void {
    this.resizeObserver = resizeObserver(
      this, // Observe the custom element itself
      debounce(() => {
        if (this.controller) {
          this.controller.handleResize().catch(console.error)
        }
      }, 100) // Debounce to avoid excessive resize handling
    )
  }

  /**
   * Cleans up resources and event listeners
   *
   * This method is called when the element is disconnected
   * from the DOM and ensures all resources are properly
   * released to prevent memory leaks.
   *
   * @private
   */
  private cleanup(): void {
    // Destroy the marquee controller
    if (this.controller) {
      this.controller.destroy()
      this.controller = null
    }

    // Disconnect the resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    // Remove the canvas element
    if (this.canvas) {
      this.canvas.remove()
      this.canvas = null
    }
  }
}
