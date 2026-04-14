import {ToolConfig, ToolDefinition, UnregisterFn} from "./types"
import {isWebMCPSupported} from "./utils";

export function defineTool<TInput = Record<string, unknown>>(config: ToolConfig<TInput>): ToolDefinition<TInput> {
   return {
       name: config.name,
       description: config.description,
       schema: config.schema,
       annotations: config.annotations ?? {},
       execute: config.execute
   }
}

/** Tracks registered tool names for cleanup */
const registeredTools = new Set<string>()

/**
 * Registers a tool with WebMCP.
 *
 * If WebMCP is not supported, this function does nothing (silent no-op).
 * The tool's execute function is wrapped with error handling.
 *
 * @param tool - Tool definition from `defineTool()`
 * @returns Function to unregister the tool
 *
 * @example
 * ```typescript
 * import { defineTool, registerTool } from 'webmcp-adapter'
 *
 * const tool = defineTool({ ... })
 * const unregister = registerTool(tool)
 *
 * // Later, to clean up:
 * unregister()
 * ```
 */
export function registerTool<TInput = Record<string, unknown>>(tool: ToolDefinition<TInput>): UnregisterFn {
    if (!isWebMCPSupported()) {
        return () => {}
    }

    // Wrap execute with error handling
    const wrappedExecute = async (input) => {
        try {
            return await tool.execute(input)
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            return {
                content: [{type: 'text', text: `Error: ${message}`}],
                isError: true
            }
        }
    }

    navigator.modelContext.registerTool({
        ...tool,
        execute: wrappedExecute
    })
    registeredTools.add(tool.name)

    return () => {
        if (registeredTools.has(tool.name)) {
            navigator.modelContext.unregisterTool(tool.name)
            registeredTools.delete(tool.name)
        }
    }
}

/**
 * Registers multiple tools with WebMCP and returns a single function to unregister them all.
 *
 * @param tools - Array of tool definitions from `defineTool()`
 * @returns Function to unregister all tools
 *
 * @example
 * ```typescript
 * import { defineTool, registerBatch } from 'webmcp-adapter'
 *
 * const searchTool = defineTool({ name: 'search', ... })
 * const filterTool = defineTool({ name: 'filter', ... })
 * const sortTool = defineTool({ name: 'sort', ... })
 *
 * const unregisterAll = registerBatch([searchTool, filterTool, sortTool])
 *
 * // Later, to clean up all three:
 * unregisterAll()
 * ```
 *
 * @example
 * ```typescript
 * // React usage
 * useEffect(() => {
 *   const unregister = registerBatch([toolA, toolB, toolC]);
 *   return unregister; // Cleanup on unmount
 * }, []);
 * ```
 */
export function registerBatch(tools: ToolDefinition[]): UnregisterFn {
    const unregisterFns = tools.map(tool => registerTool(tool))

    return () => {
        unregisterFns.forEach(unregisterFn => {
            unregisterFn()
        })
    }
}

/**
 * Unregisters a specific tool by name.
 *
 * @param name - The name of the tool to unregister
 * @returns `true` if the tool was found and removed, `false` otherwise
 */
export function unregisterTool(name: string) {
    if (!registeredTools.has(name)) {
        return false
    }
    if (isWebMCPSupported()) {
        navigator.modelContext.unregisterTool(name)
    }
    registeredTools.delete(name)
    return true
}

/**
 * Unregisters all tools that were registered through this adapter.
 *
 * @example
 * ```typescript
 * import { unregisterAllTools } from 'webmcp-adapter';
 *
 * // On page unload
 * window.addEventListener('beforeunload', () => {
 *   unregisterAllTools();
 * });
 * ```
 *
 * @example
 * ```typescript
 * // On user logout
 * function handleLogout() {
 *   unregisterAllTools();
 *   // ... other cleanup
 * }
 * ```
 */
export function unregisterAllTools() {
    if (isWebMCPSupported()){
        registeredTools.forEach(name => {
            navigator.modelContext.unregisterTool(name)
        })
    }
    registeredTools.clear()
}
