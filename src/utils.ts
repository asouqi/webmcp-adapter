/**
 * Checks if WebMCP is supported in the current environment.
 *
 * WebMCP requires Chrome 146+ with the experimental flag enabled:
 * chrome://flags/#enable-experimental-web-platform-features
 **/
export function isWebMCPSupported(): boolean {
    return (
        typeof navigator !== 'undefined' &&
        navigator.modelContext !== undefined &&
        typeof navigator.modelContext.registerTool === 'function'
    );
}