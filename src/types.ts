import {InputSchema, ToolAnnotations, ToolResponse} from "@mcp-b/webmcp-types";

/**
 * Configuration for defining a tool via `defineTool()`.
 */
export interface ToolConfig<TInput = Record<string, unknown>> {
    /** Unique tool name (snake_case recommended) */
    name: string

    /** Human-readable description for the AI agent */
    description: string

    /** JSON Schema defining the input parameters */
    schema: InputSchema

    /** Optional WebMCP annotations */
    annotations?: ToolAnnotations

    /** Function executed when the tool is called */
    execute: (input: TInput) => Promise<ToolResponse> | ToolResponse
}

/**
 * Normalized tool definition returned by `defineTool()`.
 */
export interface ToolDefinition<TInput = Record<string, unknown>> {
    readonly name: string
    readonly description: string
    readonly schema: InputSchema
    readonly annotations: ToolAnnotations
    readonly execute: (input: TInput) => Promise<ToolResponse> | ToolResponse
}

export type UnregisterFn = () => void