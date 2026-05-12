import { ToolDefinition, ToolConfig, UnregisterFn, ValidationResult, StandardSchema } from "./types"
import { isWebMCPSupported } from "./utils"
import { defineTool, registerTool, registerBatch, unregisterTool, unregisterAllTools} from "./tool"
import { validateJsonSchema, isStandardSchema, validateWithStandardSchema } from "./validator"

export type { InputSchema, JsonValue } from '@mcp-b/webmcp-types'

export type {
    ToolDefinition,
    ToolConfig,
    UnregisterFn,
    ValidationResult,
    StandardSchema,
}

export {
    isWebMCPSupported,
    defineTool,
    registerTool,
    registerBatch,
    unregisterTool,
    unregisterAllTools,
    validateJsonSchema,
}