import { ToolDefinition, ToolConfig, UnregisterFn, ValidationResult, StandardSchema } from "./types"
import { isWebMCPSupported } from "./utils"
import { defineTool, registerTool, registerBatch, unregisterTool, unregisterAllTools} from "./tool"

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
}