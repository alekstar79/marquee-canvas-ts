/**
 * Marquee Canvas Project - Main Application Entry Point
 * This file serves as the main coordinator for the entire application.
 * It initializes all components, manages application state, and handles
 * global events like resizing and font loading.
 */

import { createCachingLoader, resizeObserver, debounce, loadFont } from './utils'
import { MarqueeController } from './components/MarqueeController'
import MarqueeCanvas from './components/MarqueeCanvas'

import './css/library.css'
import './css/demo.css'


// Application State Interface

/**
 * Represents the global state of the Marquee Canvas application
 *
 * This interface defines all the data that needs to be tracked
 * throughout the application's lifecycle.
 */
interface AppState {
  /** Array of loaded font faces for text rendering */
  fontsLoaded: FontFace[]
  /** Array of active marquee controller instances */
  marquees: MarqueeController[]
  /** Flag indicating whether the app has been initialized */
  isInitialized: boolean
}


// Global Application State

/**
 * The main application state object
 *
 * This object tracks all marquee instances, loaded fonts,
 * and the initialization status of the application.
 */
const state: AppState = {
  fontsLoaded: [],
  marquees: [],
  isInitialized: false
}

// Caching Loader for Fonts

/**
 * Caching loader instance for font loading
 *
 * This loader caches font loading requests to avoid duplicate
 * network requests for the same font.
 */
const { load } = createCachingLoader(loadFont)

// Event Handlers

/**
 * Handles mouseenter events to pause marquee animations
 * @param {Event} event - The mouseenter event object
 */
const mouseEnterHandler = (event: Event): void => {
  const target = event.target as HTMLElement
  target.classList.add('paused')
}

/**
 * Handles mouseleave events to resume marquee animations
 * @param {Event} event - The mouseleave event object
 */
const mouseLeaveHandler = (event: Event): void => {
  const target = event.target as HTMLElement
  target.classList.remove('paused')
}

// Text Processing Functions

/**
 * Formats phrase text for marquee display
 *
 * This function takes a plain text phrase and formats it with
 * decorative elements and capitalization for the marquee display.
 *
 * @param {string} phrase - The original text phrase
 * @param {boolean} reverse - Whether the marquee is in reverse direction
 * @param {boolean} uppercase - Whether to write the phrase in uppercase or lowercase letters
 * @returns {string} The formatted marquee text
 *
 * @example
 * getPhrase('hello world', false); // Returns "  HELLO WORLD  *"
 * getPhrase('hello world', true);  // Returns "*  HELLO WORLD  "
 */
function getPhrase(phrase: string, reverse: boolean, uppercase: boolean = false): string {
  const text = (reverse ? `*  ${phrase}  ` : `  ${phrase}  *`)

  return uppercase ? text.toUpperCase() : text
}

/**
 * Sets up event listeners for a canvas element
 *
 * This function attaches mouseenter and mouseleave event listeners
 * to a canvas element to enable hover-based animation pausing.
 *
 * @param {HTMLElement} element - The canvas element to attach listeners to
 */
function setEventListeners(element: HTMLElement): void {
  // Remove existing listeners to prevent duplicates
  element.removeEventListener('mouseenter', mouseEnterHandler)
  element.removeEventListener('mouseleave', mouseLeaveHandler)

  // Add new listeners
  element.addEventListener('mouseenter', mouseEnterHandler)
  element.addEventListener('mouseleave', mouseLeaveHandler)
}

// Marquee Initialization Functions

/**
 * Initializes all marquee instances on the page
 *
 * This function finds all canvas elements with data attributes
 * and initializes marquee controllers for them. It also logs
 * any custom marquee elements found.
 */
function initializeMarquees(): void {
  // Clear existing marquees
  state.marquees = []

  // Log custom elements (they initialize themselves)
  const customElements = document.querySelectorAll('marquee-canvas')
  console.log(`Found ${customElements.length} custom marquee elements`)

  // Initialize canvas elements with data attributes
  document.querySelectorAll<HTMLCanvasElement>('[data-canvas]')
    .forEach((canvas) => {
      // Set up interactivity
      setEventListeners(canvas)

      // Extract configuration from data attributes
      const uppercase = canvas.hasAttribute('data-uppercase')
      const reverse = canvas.hasAttribute('data-reverse')

      // Create and initialize marquee controller
      const marquee = MarqueeController.init(canvas, {
        text: getPhrase(canvas.getAttribute('data-phrase') || '', reverse, uppercase),
        font: canvas.getAttribute('data-font') || 'bold 5rem sans-serif',
        textColor: canvas.getAttribute('data-color') || '#3e86aa',
        paddingX: parseInt(canvas.getAttribute('data-padding-x') || '0'),
        paddingY: parseInt(canvas.getAttribute('data-padding-y') || '36'),
        speed: parseInt(canvas.getAttribute('data-speed') || '2'),
        reverse
      })

      // Track the marquee instance
      state.marquees.push(marquee)
    })
}

// Resize Handling Functions

/**
 * Sets up resize observers for responsive behavior
 *
 * This function creates resize observers for all marquee containers
 * and sets up global resize event handlers to ensure marquees
 * adapt to size changes.
 */
function setupResizeObservers(): void {
  // Observe each marquee container individually
  document.querySelectorAll('.marquee-canvas, [marquee-canvas]')
    .forEach(container => {
      resizeObserver(
        container,
        debounce(() => {
          // Find marquees that belong to this container
          const containerMarquees = state.marquees.filter(marquee => {
            if (!marquee.canvas) return false
            const marqueeContainer = marquee.canvas.closest('.marquee-canvas, [marquee-canvas]')
            return marqueeContainer === container
          })

          // Trigger resize handling for each affected marquee
          containerMarquees.forEach(marquee => {
            if (marquee && marquee.handleResize) {
              marquee.handleResize().catch(console.error)
            }
          })
        }, 100) // Debounce to avoid excessive resize handling
      )
    })

  // Global window resize handler
  window.addEventListener('resize', debounce(() => {
    state.marquees.forEach(marquee => {
      if (marquee && marquee.handleResize) {
        marquee.handleResize().catch(console.error)
      }
    })
  }, 100))

  // Handle device pixel ratio changes (zoom, display changes)
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    mediaQuery.addEventListener('change', debounce(() => {
      state.marquees.forEach(marquee => {
        if (marquee && marquee.handleResize) {
          marquee.handleResize().catch(console.error)
        }
      })
    }, 100))
  }
}

// Application Initialization Functions

/**
 * Initializes the main application
 *
 * This function sets up all components and starts the application.
 * It should only be called once during the application lifecycle.
 */
function initializeApp(): void {
  // Prevent multiple initializations
  if (state.isInitialized) return

  // Register the custom element
  MarqueeCanvas.register()

  // Set up responsive behavior
  setupResizeObservers()

  // Initialize all marquees
  initializeMarquees()

  // Mark app as initialized
  state.isInitialized = true
  console.log('Marquee Canvas application initialized')
}

/**
 * Sets up page visibility change handling
 *
 * This function handles the page visibility API to pause
 * animations when the page is not visible (tab switched,
 * window minimized, etc.) to save resources.
 */
function setupVisibilityHandler(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page is hidden - stop all animations
      state.marquees.forEach(marquee => {
        if (marquee.stopAnimation) {
          marquee.stopAnimation()
        }
      })
    } else {
      // Page is visible - restart all animations
      state.marquees.forEach(marquee => {
        if (marquee.startAnimation) {
          marquee.startAnimation()
        }
      })
    }
  })
}

/**
 * Sets up global error handling
 *
 * This function captures unhandled errors and promise rejections
 * to prevent the application from crashing silently.
 */
function setupErrorHandling(): void {
  // Handle synchronous errors
  window.addEventListener('error', (event) => {
    console.error('Application error:', event.error)
  })

  // Handle asynchronous promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason)
  })
}

/**
 * Preloads required fonts for the application
 *
 * This function loads the primary font used in the marquees
 * to ensure it's available when the marquees initialize.
 *
 * @async
 * @returns {Promise<void>}
 */
async function preloadFonts(): Promise<void> {
  try {
    await load('bold 5rem Roboto')
    console.log('Fonts preloaded successfully')
  } catch (error) {
    console.warn('Font preloading failed:', error)
  }
}

// Main Application Entry Point

/**
 * Main application initialization function
 *
 * This is the entry point of the application that coordinates
 * all setup tasks in the correct order.
 *
 * @async
 * @returns {Promise<void>}
 */
export async function main(): Promise<void> {
  try {
    // Preload fonts before initializing marquees
    await preloadFonts()

    // Initialize based on document ready state
    if (document.readyState === 'loading') {
      // Document is still loading - wait for DOMContentLoaded
      document.addEventListener('DOMContentLoaded', () => {
        initializeApp()
        setupVisibilityHandler()
        setupErrorHandling()
      })
    } else {
      // Document is already ready - initialize immediately
      initializeApp()
      setupVisibilityHandler()
      setupErrorHandling()
    }
  } catch (error) {
    console.error('Failed to initialize application:', error)
  }
}

// Start the application
main().catch(console.error)

// Development Utilities

/**
 * Development tools and debugging aids
 *
 * These are only available in development mode and provide
 * useful debugging capabilities.
 */
// @ts-ignore
if (import.meta.env.DEV) {
  // Expose application state globally for debugging
  (window as any).marqueeApp = {
    state,
    utils: {
      getPhrase,
      initializeMarquees
    }
  }

  console.log('Marquee Canvas development tools available at window.marqueeApp')
}
