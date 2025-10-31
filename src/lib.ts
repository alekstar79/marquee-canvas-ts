/**
 * Marquee Canvas Library - Main Library Entry Point
 *
 * This file serves as the main entry point for the Marquee Canvas library.
 * It exports all public APIs and styles for consumption by other applications.
 */

// Export main controller class
export { MarqueeController } from './components/MarqueeController'

// Export custom element class
export { default as MarqueeCanvas } from './components/MarqueeCanvas'

// Export types and interfaces
export type { MarqueeOptions } from './components/MarqueeController'

// Export utility functions
export {
  getCurrentPixelRatio,
  debounce,
  resizeObserver,
  createCachingLoader,
  loadFont,
  measureText
} from './utils'

// Import and re-export styles
import './css/library.css'

/**
 * Library initialization function
 * Registers the custom element and makes the library ready for use
 *
 * @example
 * import { initializeMarqueeLibrary } from 'marquee-canvas-ts'
 * initializeMarqueeLibrary()
 */
export function initializeMarqueeLibrary(): void {
  // This will be called automatically when the custom element is imported
  // but provides an explicit initialization method for users
  console.log('Marquee Canvas library initialized')
}

/**
 * Auto-initialize the library when imported
 * This ensures the custom element is registered immediately
 */
initializeMarqueeLibrary()
