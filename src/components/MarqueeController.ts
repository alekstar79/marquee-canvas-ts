// Import utilities for pixel ratio and text measurement
import { getCurrentPixelRatio, measureText } from '@/utils'


// Type Definitions

/**
 * Configuration options for the marquee animation
 *
 * This interface defines all the customizable properties
 * that control the appearance and behavior of the marquee.
 */
export interface MarqueeOptions {
  /** The text content to display in the marquee */
  text: string;
  /** CSS font property string (e.g., "bold 5rem Roboto") */
  font: string;
  /** Text color in any valid CSS color format */
  textColor: string;
  /** Animation direction (true = right to left, false = left to right) */
  reverse: boolean;
  /** Horizontal spacing between text instances in pixels */
  paddingX: number;
  /** Vertical padding around the text in pixels */
  paddingY: number;
  /** Animation speed in pixels per frame */
  speed: number;
  /** Optional background color for the canvas */
  backgroundColor?: string;
}

/**
 * Represents a single instance of the text in the marquee
 *
 * Each instance tracks its position and is part of the seamless
 * animation where multiple copies of the text flow continuously.
 */
interface TextInstance {
  /** Horizontal position of this text instance */
  x: number;
  /** Width of the text for boundary calculations */
  width: number;
  /** Index for tracking and debugging */
  index: number;
}

// Main Controller Class

/**
 * Main controller class for canvas-based marquee animations
 *
 * This class handles all aspects of the marquee animation including:
 * - Canvas setup and sizing
 * - Text measurement and positioning
 * - Animation loop management
 * - Responsive resizing
 *
 * @example
 * const canvas = document.querySelector('canvas')
 * const marquee = MarqueeController.init(canvas, {
 *   text: 'Hello World',
 *   font: 'bold 5rem Arial',
 *   textColor: '#ff0000',
 *   speed: 2
 * })
 */
export class MarqueeController {
  // Public Properties

  /** The canvas element this controller is managing */
  public canvas: HTMLCanvasElement


  // Private Properties

  /** 2D rendering context for the canvas */
  private context: CanvasRenderingContext2D | null = null
  /** Current configuration options */
  private options: MarqueeOptions
  /** Device pixel ratio for high-DPI display support */
  private ratio: number = 1
  /** Array of text instances for seamless animation */
  private instances: TextInstance[] = []
  /** ID of the current animation frame for cancellation */
  private animationId: number | null = null
  /** Flag indicating if the controller is initialized */
  private isInitialized: boolean = false
  /** Container element for responsive sizing */
  private container: HTMLElement | null = null
  /** Measured width of the text content */
  private textWidth: number = 0
  /** Measured height of the text content */
  private textHeight: number = 0
  /** Total width including padding for instance spacing */
  private effectiveTextWidth: number = 0

  // Constructor and Static Methods

  /**
   * Creates and initializes a new MarqueeController instance
   *
   * This is the preferred way to create a marquee controller as it
   * handles both instantiation and initialization.
   *
   * @static
   * @param {HTMLCanvasElement} canvas - The canvas element to animate on
   * @param {Partial<MarqueeOptions>} options - Configuration options
   * @returns {MarqueeController} The initialized marquee controller instance
   *
   * @example
   * const controller = MarqueeController.init(canvas, {
   *   text: 'Running Text',
   *   speed: 3
   * })
   */
  static init(canvas: HTMLCanvasElement, options: Partial<MarqueeOptions>): MarqueeController {
    const marquee = new MarqueeController(canvas, options)
    marquee.initialize().catch(console.error)
    return marquee
  }

  /**
   * Creates a new MarqueeController instance
   *
   * @constructor
   * @param {HTMLCanvasElement} canvas - The canvas element to render on
   * @param {Partial<MarqueeOptions>} options - Partial configuration options
   */
  constructor(canvas: HTMLCanvasElement, options: Partial<MarqueeOptions> = {}) {
    this.canvas = canvas
    this.options = { ...this.getDefaultOptions(), ...options }

    // Bind methods to preserve 'this' context in animation loop
    this.animate = this.animate.bind(this)
    this.handleResize = this.handleResize.bind(this)
  }

  // Private Methods - Configuration

  /**
   * Provides default configuration options
   *
   * These defaults are used when options are not provided
   * or only partially provided by the user.
   *
   * @private
   * @returns {MarqueeOptions} Complete set of default options
   */
  private getDefaultOptions(): MarqueeOptions {
    return {
      text: 'Default marquee text',
      font: 'bold 5rem sans-serif',
      textColor: 'rgba(202,39,39,0.7)',
      backgroundColor: 'transparent',
      reverse: false,
      paddingX: 20,
      paddingY: 36,
      speed: 2
    }
  }

  // Public Methods - Lifecycle

  /**
   * Initializes the marquee controller
   *
   * This method sets up the canvas, calculates text measurements,
   * creates text instances, and starts the animation loop.
   *
   * @async
   * @returns {Promise<void>}
   * @throws {Error} If canvas context cannot be obtained
   *
   * @example
   * await marquee.initialize()
   */
  async initialize(): Promise<void> {
    try {
      await this.setupCanvas()
      this.setupTextInstances()
      this.startAnimation()
      this.isInitialized = true
    } catch (error) {
      console.error('MarqueeController initialization failed:', error)
      throw error
    }
  }

  /**
   * Handles container resize events
   *
   * This method should be called when the container size changes
   * to ensure the marquee adapts to the new dimensions.
   *
   * @async
   * @returns {Promise<void>}
   *
   * @example
   * window.addEventListener('resize', () => {
   *   marquee.handleResize()
   * })
   */
  async handleResize(): Promise<void> {
    if (!this.isInitialized) return

    // Stop animation during resize to prevent visual glitches
    this.stopAnimation()

    // Re-setup canvas and instances with new dimensions
    await this.setupCanvas()
    this.setupTextInstances()

    // Restart animation
    this.startAnimation()
  }

  /**
   * Updates marquee options and reinitializes if needed
   *
   * Use this method to dynamically change marquee properties
   * like text, color, speed, or direction.
   *
   * @param {Partial<MarqueeOptions>} options - New options to merge with current ones
   *
   * @example
   * marquee.update({
   *   text: 'New Text',
   *   speed: 5,
   *   textColor: '#00ff00'
   * })
   */
  update(options: Partial<MarqueeOptions>): void {
    // Merge new options with existing ones
    this.options = { ...this.options, ...options }

    // Reinitialize if already running
    if (this.isInitialized) {
      this.setupCanvas()
        .then(() => this.setupTextInstances())
        .catch(console.error)
    }
  }

  /**
   * Destroys the marquee controller and cleans up resources
   *
   * This method should be called when the marquee is no longer needed
   * to prevent memory leaks and stop the animation loop.
   *
   * @example
   * marquee.destroy();
   */
  destroy(): void {
    this.stopAnimation()
    this.instances = []
    this.context = null
    this.isInitialized = false
    this.container = null
  }

  // Private Methods - Setup and Configuration

  /**
   * Sets up the canvas element with proper dimensions and context
   *
   * This method handles:
   * - Device pixel ratio detection
   * - Container size calculation
   * - Canvas physical and CSS dimensions
   * - 2D context configuration
   *
   * @private
   * @async
   * @returns {Promise<void>}
   */
  private async setupCanvas(): Promise<void> {
    // Get device pixel ratio for high-DPI displays
    this.ratio = getCurrentPixelRatio()

    // Find the appropriate container for sizing
    this.container = this.findContainer()

    // Calculate logical dimensions
    const logicalWidth = this.getContainerWidth()
    const logicalHeight = await this.measureTextHeight()

    // Set physical dimensions (actual pixels in the canvas)
    this.canvas.width = Math.ceil(logicalWidth * this.ratio)
    this.canvas.height = Math.ceil(logicalHeight * this.ratio)

    // Set CSS dimensions (how the canvas appears on screen)
    this.canvas.style.width = '100%'
    this.canvas.style.height = `${logicalHeight}px`

    // Get 2D rendering context
    this.context = this.canvas.getContext('2d', { alpha: true })

    if (!this.context) {
      throw new Error('Could not get 2D context from canvas')
    }

    // Reset any existing transforms and set scale for high-DPI
    this.context.setTransform(1, 0, 0, 1, 0, 0)
    this.context.scale(this.ratio, this.ratio)

    // Calculate font metrics for precise rendering
    await this.setupFontMetrics()
  }

  /**
   * Finds the appropriate container element for responsive sizing
   *
   * This method traverses up the DOM tree to find a suitable
   * container element that defines the marquee's width.
   *
   * @private
   * @returns {HTMLElement} The container element to use for sizing
   */
  private findContainer(): HTMLElement {
    let container: HTMLElement | null = this.canvas.parentElement

    // Traverse up the DOM tree until we find a suitable container
    while (container && container !== document.body) {
      // Check for common container classes and attributes
      if (container.classList.contains('marquee-canvas') ||
          container.classList.contains('banner') ||
          container.hasAttribute('marquee-canvas') ||
          container.clientWidth > 300) { // Reasonable minimum width
        break
      }
      container = container.parentElement
    }

    // Fall back to document body if no suitable container found
    return container || document.body
  }

  /**
   * Calculates the container width accounting for padding and borders
   *
   * This method uses computed styles to get the actual available
   * width inside the container, excluding padding and borders.
   *
   * @private
   * @returns {number} The calculated available width in pixels
   */
  private getContainerWidth(): number {
    // If no container found, use document width as fallback
    if (!this.container) {
      return Math.max(
        document.documentElement.clientWidth,
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth
      )
    }

    // Get computed styles to account for padding and border
    const style = window.getComputedStyle(this.container)
    const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
    const border = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)

    // Calculate available width
    return this.container.clientWidth - padding - border
  }

  /**
   * Measures the required text height including padding
   *
   * This method calculates how tall the canvas needs to be
   * to properly display the text with the specified padding.
   *
   * @private
   * @async
   * @returns {Promise<number>} The calculated height in pixels
   */
  private async measureTextHeight(): Promise<number> {
    const metrics = measureText(this.options.text, this.options.font)
    return Math.ceil(metrics.height) + this.options.paddingY
  }

  /**
   * Sets up font metrics for precise text rendering
   *
   * This method configures the canvas context with the current font
   * and measures the text dimensions for accurate positioning.
   *
   * @private
   * @async
   * @returns {Promise<void>}
   */
  private async setupFontMetrics(): Promise<void> {
    if (!this.context) return

    // Configure text rendering settings
    this.context.font = this.options.font
    this.context.fillStyle = this.options.textColor
    this.context.textBaseline = 'alphabetic'
    this.context.textAlign = 'left'

    // Measure text dimensions
    const metrics = this.context.measureText(this.options.text)
    this.textWidth = Math.ceil(metrics.width)
    this.textHeight = Math.ceil(
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    )

    // Calculate total width including padding between instances
    this.effectiveTextWidth = this.textWidth + this.options.paddingX
  }

  /**
   * Sets up text instances for seamless animation
   *
   * This method creates multiple instances of the text positioned
   * to create a continuous, seamless animation effect.
   *
   * @private
   */
  private setupTextInstances(): void {
    this.instances = []
    const canvasWidth = this.canvas.width / this.ratio

    // Calculate how many instances we need to cover the canvas width plus buffer
    const instancesNeeded = Math.ceil(canvasWidth / this.effectiveTextWidth) + 4

    // Create instances with initial positions
    for (let i = 0; i < instancesNeeded; i++) {
      if (this.options.reverse) {
        // For reverse animation: start from right edge, moving left
        this.instances.push({
          x: canvasWidth + (i * this.effectiveTextWidth),
          width: this.textWidth,
          index: i
        })
      } else {
        // For normal animation: start from left edge, moving right
        this.instances.push({
          x: (i * this.effectiveTextWidth) - this.effectiveTextWidth,
          width: this.textWidth,
          index: i
        })
      }
    }
  }

  // Private Methods - Animation Loop

  /**
   * Starts the animation loop
   *
   * This method initiates the requestAnimationFrame loop
   * that drives the marquee animation.
   *
   * @private
   */
  startAnimation(): void {
    if (!this.animationId) {
      this.animationId = requestAnimationFrame(this.animate)
    }
  }

  /**
   * Stops the animation loop
   *
   * This method cancels any ongoing animation frame requests
   * to stop the animation.
   *
   * @private
   */
  stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * Main animation frame handler
   *
   * This method is called on every animation frame and handles:
   * - Updating text positions
   * - Drawing the current frame
   * - Requesting the next animation frame
   *
   * @private
   */
  private animate(): void {
    // Request next animation frame to continue the loop
    this.animationId = requestAnimationFrame(this.animate)

    // Skip animation updates if paused (e.g., on hover)
    if (this.canvas.classList.contains('paused')) return

    // Update positions and draw the frame
    this.updatePositions()
    this.draw()
  }

  /**
   * Updates positions of all text instances
   *
   * This method moves each text instance according to the current
   * speed and direction, handling wrap-around when instances
   * move off-screen.
   *
   * @private
   */
  private updatePositions(): void {
    const canvasWidth = this.canvas.width / this.ratio
    const speed = this.options.speed

    if (this.options.reverse) {
      // Move from right to left
      this.instances.forEach(instance => {
        instance.x -= speed

        // Check if instance has moved completely off the left side
        if (instance.x + this.textWidth < 0) {
          // Find the rightmost instance and place this instance after it
          const rightmost = this.instances.reduce((max, inst) => inst.x > max.x ? inst : max, this.instances[0])
          instance.x = rightmost.x + this.effectiveTextWidth
        }
      })
    } else {
      // Move from left to right
      this.instances.forEach(instance => {
        instance.x += speed

        // Check if instance has moved completely off the right side
        if (instance.x > canvasWidth) {
          // Find the leftmost instance and place this instance before it
          const leftmost = this.instances.reduce((min, inst) => inst.x < min.x ? inst : min, this.instances[0])
          instance.x = leftmost.x - this.effectiveTextWidth
        }
      })
    }
  }

  /**
   * Draws all text instances to the canvas
   *
   * This method clears the canvas and redraws all visible
   * text instances at their current positions.
   *
   * @private
   */
  private draw(): void {
    if (!this.context) return

    const canvasWidth = this.canvas.width / this.ratio
    const canvasHeight = this.canvas.height / this.ratio

    // Clear the entire canvas
    this.context.clearRect(0, 0, canvasWidth, canvasHeight)

    // Configure text rendering styles
    this.context.font = this.options.font
    this.context.fillStyle = this.options.textColor
    this.context.textBaseline = 'top'

    // Calculate vertical position to center the text
    const yPos = (canvasHeight - this.textHeight) / 2

    // Draw each instance that is at least partially visible
    this.instances.forEach(instance => {
      // Only draw if the instance is within or near the visible area
      if (instance.x + this.textWidth > 0 && instance.x < canvasWidth) {
        this.context!.fillText(this.options.text, instance.x, yPos)
      }
    })
  }
}
