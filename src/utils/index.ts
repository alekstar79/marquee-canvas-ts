/**
 * Utility functions for the Marquee Canvas project
 *
 * This file contains helper functions that are used throughout the application
 * for common tasks like measurement, timing, and resource management.
 */

// Device and Display Utilities

/**
 * Gets the current device pixel ratio with precision rounding
 *
 * The device pixel ratio represents how many physical pixels are used
 * to draw one CSS pixel. This is important for high-DPI displays.
 *
 * @returns {number} The current device pixel ratio, rounded to 2 decimal places
 *
 * @example
 * const ratio = getCurrentPixelRatio(); // Returns 1, 1.5, 2, etc.
 */
export function getCurrentPixelRatio(): number {
  return Math.round((window.devicePixelRatio || 1) * 100) / 100
}

// Timing and Performance Utilities

/**
 * Creates a debounced function that delays execution until after wait milliseconds
 *
 * Debouncing is useful for limiting how often a function can be called,
 * especially for events that fire frequently like resize or scroll.
 *
 * @template T - The type of the function being debounced
 * @param {T} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @returns {(...args: Parameters<T>) => void} A debounced version of the function
 *
 * @example
 * const debouncedResize = debounce(handleResize, 250)
 * window.addEventListener('resize', debouncedResize)
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | number | undefined

  return (...args: Parameters<T>): void => {
    // Clear any existing timeout
    clearTimeout(timeoutId)

    // Set a new timeout
    timeoutId = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// DOM and Observation Utilities

/**
 * Creates a resize observer with requestAnimationFrame optimization
 *
 * ResizeObserver watches for changes to an element's size and calls
 * the provided callback. We wrap it in requestAnimationFrame for
 * better performance.
 *
 * @param {Element} target - The DOM element to observe for size changes
 * @param {(entry: ResizeObserverEntry) => void} callback - Function to call when resize occurs
 * @returns {ResizeObserver} The resize observer instance
 *
 * @example
 * const observer = resizeObserver(myElement, (entry) => {
 *   console.log('Element resized:', entry.contentRect)
 * })
 */
export function resizeObserver(
  target: Element,
  callback: (entry: ResizeObserverEntry) => void
): ResizeObserver {
  const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
    // Use requestAnimationFrame to batch updates and improve performance
    requestAnimationFrame(() => {
      if (!Array.isArray(entries) || !entries.length) {
        return
      }

      // Call the callback with the first entry (we only observe one element)
      callback(entries[0])
    })
  })

  // Start observing the target element
  observer.observe(target)

  return observer
}

// Caching and Resource Management

/**
 * Interface for the caching loader return value
 */
interface CachingLoader<T extends (...args: any[]) => any> {
  /** The cached version of the function */
  load: T
  /** Function to clear cache for specific arguments or all cache */
  invalidate: (...args: any[]) => void
}

/**
 * Creates a caching loader for expensive functions
 *
 * This wrapper caches the results of function calls based on their arguments.
 * Useful for expensive operations like font loading or API calls.
 *
 * @template T - The type of the function being cached
 * @param {T} fn - The function to cache
 * @returns {CachingLoader<T>} An object with load and invalidate methods
 *
 * @example
 * const { load, invalidate } = createCachingLoader(expensiveOperation)
 * const result1 = load('arg1') // Computes and caches
 * const result2 = load('arg1') // Returns cached result
 * invalidate('arg1') // Clears cache for 'arg1'
 */
export function createCachingLoader<T extends (...args: any[]) => any>(
  fn: T
): CachingLoader<T> {
  // Cache storage using Map for better performance
  let cache = new Map<string, ReturnType<T>>()

  // Proxy handler to intercept function calls
  const handler: ProxyHandler<T> = {
    apply(target: T, thisArg: any, args: any[]): ReturnType<T> {
      // Create a cache key from the arguments
      const key = JSON.stringify(args)

      // Return cached result if available, otherwise compute and cache
      if (!cache.has(key)) {
        cache.set(key, target.apply(thisArg, args))
      }

      return cache.get(key)!
    }
  }

  /**
   * Invalidates cache for specific arguments or clears all cache
   * @param {...any[]} args - Arguments to clear from cache. If no arguments provided, clears all cache.
   */
  const invalidate = (...args: any[]): void => {
    if (args.length === 0) {
      // Clear entire cache
      cache = new Map()
      return
    }

    // Clear cache for specific arguments
    const key = JSON.stringify(args)
    if (!cache.delete(key)) {
      console.warn('[CachingLoader]: No cache entry found for arguments:', args)
    }
  }

  return {
    load: new Proxy(fn, handler) as T,
    invalidate
  }
}

// Font and Text Utilities

/**
 * Loads a font using the FontFace API with error handling
 *
 * This function uses the modern FontFace API to load web fonts
 * and ensures they are available for canvas rendering.
 *
 * @param {string} font - CSS font string (e.g., "bold 5rem Roboto")
 * @returns {Promise<FontFace[]>} Promise that resolves to an array of loaded font faces
 *
 * @example
 * await loadFont('bold 5rem Roboto')
 * // Font is now available for canvas rendering
 */
export async function loadFont(font: string): Promise<FontFace[]> {
  try {
    // Extract font family from the CSS font string using regex
    const fontFamilyMatch = font.match(/(?:\d+\s+\d+\s+)?['"]?([^,'"]+)['"]?/)
    const fontFamily = fontFamilyMatch ? fontFamilyMatch[1] : 'sans-serif'

    // Load the font using the FontFace API
    await document.fonts.load(font)

    // Return the loaded font faces for verification
    return Array.from(document.fonts).filter(face =>
      face.family.includes(fontFamily)
    )
  } catch (error) {
    console.error('Failed to load font:', error)
    throw error
  }
}

/**
 * Measures text dimensions using canvas 2D context
 *
 * This function creates a temporary canvas to measure text dimensions
 * accurately, which is essential for proper text positioning and layout.
 *
 * @param {string} text - The text string to measure
 * @param {string} font - CSS font string for the text
 * @returns {{width: number, height: number}} Object containing text width and height in pixels
 *
 * @example
 * const { width, height } = measureText('Hello World', 'bold 5rem Roboto');
 * console.log(`Text size: ${width}x${height}px`);
 */
export function measureText(text: string, font: string): { width: number; height: number } {
  // Create a temporary canvas element for measurement
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  // Return zero dimensions if canvas context is not available
  if (!ctx) {
    return { width: 0, height: 0 }
  }

  // Set the font and measure the text
  ctx.font = font
  const metrics = ctx.measureText(text)

  // Calculate dimensions including ascent and descent
  return {
    width: Math.ceil(metrics.width),
    height: Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
  }
}
