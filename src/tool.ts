import {InferArgsFromInputSchema, InputSchema} from "@mcp-b/webmcp-types"
import {isWebMCPSupported} from "./utils";
import {isStandardSchema, validateJsonSchema, validateWithStandardSchema} from "./validator";
import {ToolConfig, ToolDefinition, UnregisterFn} from "./types"

export function defineTool<TSchema extends InputSchema = InputSchema>(config: ToolConfig<TSchema>): ToolDefinition<TSchema> {
   return {
       name: config.name,
       description: config.description,
       schema: config.schema as TSchema,
       annotations: config.annotations ?? {},
       validator: config.validator,
       execute: config.execute
   }
}

/** Tracks tool ownership for safe cleanup */
const TOOL_OWNER_BY_NAME = new Map<string, symbol>()

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
export function registerTool<TSchema extends InputSchema = InputSchema>(tool: ToolDefinition<TSchema>): UnregisterFn {
    if (!isWebMCPSupported()) {
        return () => {}
    }

    // Wrap execute with error handling
    const wrappedExecute = async (input: InferArgsFromInputSchema<TSchema>) => {
        try {
            let validationResult

            if (tool.validator && isStandardSchema(tool.validator)) {
                validationResult = await validateWithStandardSchema(tool.validator, input)
            } else {
                validationResult = validateJsonSchema(tool.schema, input)
            }

            if (!validationResult.valid) {
                return {
                    content: [{ type: 'text', text: `Validation error: ${validationResult.error}` }],
                    isError: true
                }
            }

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

    const ownerToken = Symbol(tool.name)
    TOOL_OWNER_BY_NAME.set(tool.name, ownerToken)

    return () => {
        const currentToken = TOOL_OWNER_BY_NAME.get(tool.name)
        if (currentToken === ownerToken) {
            navigator.modelContext.unregisterTool(tool.name)
            TOOL_OWNER_BY_NAME.delete(tool.name)
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
    if (!TOOL_OWNER_BY_NAME.has(name)) {
        return false
    }
    if (isWebMCPSupported()) {
        navigator.modelContext.unregisterTool(name)
    }
    TOOL_OWNER_BY_NAME.delete(name)
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
        TOOL_OWNER_BY_NAME.forEach((_, name) => {
            navigator.modelContext.unregisterTool(name)
        })
    }
    TOOL_OWNER_BY_NAME.clear()
}
