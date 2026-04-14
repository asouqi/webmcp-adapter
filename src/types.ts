import {InputSchema, ToolAnnotations, ToolResponse} from "@mcp-b/webmcp-types";

export interface ValidationResult {
    valid: boolean
    error?: string
}

export interface StandardSchemaResult {
    value?: unknown
    issues?: Array<{ message: string; path?: Array<string | number> }>
}

export interface StandardSchema {
    '~standard': {
        version: 1
        vendor: string
        validate: (value: unknown) => Promise<StandardSchemaResult>
    }
}

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

    /**
     * Optional custom validator (Zod, Valibot, ArkType).
     * If not provided, the built-in JSON Schema validator is used.
     */
    validator?: StandardSchema

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
    readonly validator?: StandardSchema
    readonly execute: (input: TInput) => Promise<ToolResponse> | ToolResponse
}

export type UnregisterFn = () => void