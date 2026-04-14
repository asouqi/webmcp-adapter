import { ToolDefinition, ToolConfig, UnregisterFn } from "./types"
import { isWebMCPSupported } from "./utils"
import { defineTool, registerTool, registerBatch, unregisterTool, unregisterAllTools} from "./tool"

export {
    ToolDefinition,
    ToolConfig,
    UnregisterFn,
    isWebMCPSupported,
    defineTool,
    registerTool,
    registerBatch,
    unregisterTool,
    unregisterAllTools,
}