import { StandardSchema, StandardSchemaResult, ValidationResult } from "./types"
import {InputSchema, JsonSchemaArray, JsonSchemaNumber, JsonSchemaString} from "@mcp-b/webmcp-types"

/**
 * Checks if a value implements the Standard Schema interface.
 * Used to detect Zod, Valibot, ArkType validators.
 */
export function isStandardSchema(value: unknown): value is StandardSchema {
   return value !== null &&
       typeof value === "object" &&
       "~standard" in value &&
       typeof (value as StandardSchema)
           ['~standard'].validate === "function"
}

/**
 * Validates input using a Standard Schema validator.
 */
export async function validateWithStandardSchema(schema: StandardSchema, input: unknown): Promise<ValidationResult> {
    const result = await schema["~standard"].validate(input)

    if (result.issues && result.issues.length > 0) {
        const issues = result.issues[0]
        const path = issues.path?.join('.') || ''
        const error = path ? `${path}: ${issues.message}` : issues.message
        return { valid: false, error }
    }
    return { valid: true }
}

/**
 * Validates input against a JSON Schema.
 * Lightweight validator covering common use cases.
 */
export function validateJsonSchema(schema: InputSchema, input: unknown): ValidationResult {
    // Handle missing input
    if (input === undefined || input === null) {
        if (schema.required && schema.required.length > 0) {
            return {
                valid: false,
                error: "Missing required input"
            }
        }
        return {valid: true}
    }

    // Validate type
    const typeError = validateType(input, schema)
    if (typeError) {
        return { valid: false, error: typeError }
    }

    // Validate object properties
    if (schema.type === "object" && typeof input === "object" && !Array.isArray(input)) {
        const objectInput = input as Record<string, unknown>
        if (schema.required) {
            for (const key of schema.required){
                if (!(key in objectInput) || objectInput[key] === undefined) {
                    return {
                        valid: false,
                        error: `Missing required filed: ${key}`
                    }
                }
            }
        }
        if (schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (key in objectInput) {
                    const result = validateJsonSchema(propSchema, objectInput[key])
                    if (!result.valid) {
                        return {
                            valid: false,
                            error: `${key}: ${result.error}`
                        }
                    }
                }
            }
        }
    }

    // Validate array items
    if (schema.type === 'array' && Array.isArray(input)) {
        const arraySchema = schema as JsonSchemaArray
        if(arraySchema.items) {
            for (let i = 0; i < input.length; i++) {
                const result = validateJsonSchema(input[i], arraySchema.items)
                if (!result.valid) {
                    return {
                        valid: false,
                        error: `[${i}]: ${result.error}`
                    }
                }
            }
        }

        const {minItems, maxItems} = arraySchema
        if (minItems !== undefined && input.length < minItems) {
            return {
                valid: false,
                error: `Array must have at least ${minItems} items`
            }
        }
        if (maxItems !== undefined && input.length > maxItems) {
            return {
                valid: false,
                error: `Array must have at most ${maxItems} items`
            }
        }
    }

    return { valid: true }
}

/**
 * Validates that input matches the expected type.
 */
function validateType(input: unknown, schema: InputSchema) {
    const schemaType = schema.type

    if (!schemaType) {
        return null // No type constraint
    }

    const types = Array.isArray(schemaType) ? schemaType : [schemaType]

    for(const type of types) {
       if (matchType(type, input, schema)) {
           return null
       }
    }

    return `Expected ${types.join(" | ")}, got ${getTypeName(input)}`
}

/**
 * Checks if input matches a single type.
 */
function matchType(type: string, input: unknown, schema: InputSchema) {
    switch (type) {
        case "string":
            if (typeof input !== "string") return false
            return validateStringConstraints(input, schema)
        case "number":
        case "integer":
            if (typeof input !== "number") return false
            if (type === "integer" && !Number.isInteger(input)) return false
            return validateNumberConstraints(input, schema)
        case "boolean":
            return typeof input === "boolean"
        case "null":
            return input === null
        case "array":
            return Array.isArray(input)
        case "object":
            return typeof input === "object" && input !== null && !Array.isArray(input)
        default:
            return true // unknown type allowed
    }
}

/**
 * Validates string-specific constraints.
 */
function validateStringConstraints(input: string, schema: InputSchema) {
    const s = schema as JsonSchemaString
    if (s.minLength !== undefined && input.length < s.minLength) return false
    if (s.maxLength !== undefined && input.length > s.maxLength) return false
    if (s.enum !== undefined && !s.enum.includes(input)) return false
    return true
}

/**
 * Validates number-specific constraints.
 */
function validateNumberConstraints(input: number, schema: InputSchema) {
    const n = schema as JsonSchemaNumber
    if (n.minimum !== undefined && input < n.minimum) return false
    if (n.maximum !== undefined && input > n.maximum) return false
    if (n.exclusiveMinimum !== undefined && input <= n.exclusiveMinimum) return false
    if (n.exclusiveMaximum !== undefined && input >= n.exclusiveMaximum) return false
    if (n.enum && !n.enum.includes(input)) return false
    return true
}

/**
 * Gets a human-readable type name for error messages.
 */
function getTypeName(value: unknown) {
    if (value === null) return "null"
    if (Array.isArray(value)) return "array"
    return typeof value
}