import {InputSchema, InferArgsFromInputSchema, ToolAnnotations, ToolResponse} from "@mcp-b/webmcp-types";

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
export interface ToolConfig<TSchema extends InputSchema = InputSchema> {
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
    execute: (input: InferArgsFromInputSchema<TSchema>) => Promise<ToolResponse> | ToolResponse
}

/**
 * Normalized tool definition returned by `defineTool()`.
 */
export interface ToolDefinition<TSchema extends InputSchema = InputSchema> {
    readonly name: string
    readonly description: string
    readonly schema: TSchema
    readonly annotations: ToolAnnotations
    readonly validator?: StandardSchema
    readonly execute: (input: InferArgsFromInputSchema<TSchema>) => Promise<ToolResponse> | ToolResponse
}

export type UnregisterFn = () => void