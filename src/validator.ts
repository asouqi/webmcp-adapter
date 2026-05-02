import { StandardSchema, ValidationResult } from "./types"
import {
    JsonSchemaArray,
    JsonSchemaNumber,
    JsonSchemaString,
    InputSchema,
    JsonSchemaForInference
} from "@mcp-b/webmcp-types"

type Schema = InputSchema | JsonSchemaForInference

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
export function validateJsonSchema(schema: Schema, input: unknown): ValidationResult {
    return validateRequiredInput(schema, input)
        ?? validateType(input, schema)
        ?? validateConst(schema, input)
        ?? validateOneOfAnyOf(schema, input)
        ?? validateAllOf(schema, input)
        ?? validateConditional(schema, input)
        ?? validateObject(schema, input)
        ?? validateArray(schema, input)
        ?? { valid: true }
}

function validateConst(schema: Schema, input: unknown): ValidationResult | null {
    if ('const' in schema) {
        if (input !== schema.const) {
            return {
                valid: false,
                error: `Expected value to be ${JSON.stringify(schema.const)}`
            }
        }
        return { valid: true }
    }
}

/**  validates against at least one schema */
function validateOneOfAnyOf(schema: Schema, input: unknown): ValidationResult | null {
    if ("oneOf" in schema && Array.isArray(schema.oneOf) ||
        "anyOf" in schema && Array.isArray(schema.anyOf)) {
        const schemas = ('oneOf' in schema ? schema.oneOf : schema.anyOf) as Schema[]
        for (const subSchema of schemas) {
            const result = validateJsonSchema(subSchema, input)
            if (result.valid) {
                return { valid: true }
            }
        }
        return {
            valid: false,
            error: "Value does not match any of the allowed schemas"
        }
    }
}

/** validates against all schemas */
function validateAllOf(schema: Schema, input: unknown): ValidationResult | null {
    if ("allOf" in schema && Array.isArray(schema.allOf)) {
        for (const subSchema of schema.allOf) {
            const result = validateJsonSchema(subSchema, input)
            if (!result.valid) {
                return result
            }
        }
        return { valid: true }
    }
}

function validateConditional(schema: Schema, input: unknown): ValidationResult | null {
    if ("if" in schema && schema.if) {
        const ifResult = validateJsonSchema(schema.if as Schema, input)

        if (ifResult.valid && "then" in schema && schema.then) {
            const thenResult = validateJsonSchema(schema.then as Schema, input)
            if (!thenResult.valid) {
                return thenResult
            }
        } else if (!ifResult.valid && "else" in schema && schema.else) {
            const elseResult = validateJsonSchema(schema.else as Schema, input)
            if (!elseResult.valid) {
                return elseResult
            }
        }
    }
}

function validateRequiredInput(schema: Schema, input: unknown): ValidationResult | null {
    if (input === undefined || input === null) {
        if (schema.type === "object" && schema.required && schema.required.length > 0) {
            return {
                valid: false,
                error: "Missing required input"
            }
        }
        return {valid: true}
    }
}

function validateObject(schema: Schema, input: unknown): ValidationResult | null {
    if ('properties' in schema && schema.properties && typeof input === "object" && !Array.isArray(input)) {
        const objectInput = input as Record<string, unknown>
        if (schema.required) {
            for (const key of schema.required){
                if (!(key in objectInput) || objectInput[key] === undefined) {
                    return {
                        valid: false,
                        error: `Missing required field: ${key}`
                    }
                }
            }
        }
        if ('properties' in schema && schema.properties) {
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
}

function validateArray(schema: Schema, input: unknown): ValidationResult | null {
    if (schema.type === 'array' && Array.isArray(input)) {
        const arraySchema = schema as JsonSchemaArray
        if(arraySchema.items) {
            for (let i = 0; i < input.length; i++) {
                const result = validateJsonSchema(arraySchema.items, input[i])
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
}

/**
 * Validates that input matches the expected type.
 */
/**
 * Validates that input matches the expected type and constraints.
 */
function validateType(input: unknown, schema: Schema): ValidationResult | null {
    const schemaType = schema.type

    if (!schemaType) {
        return null // No type constraint
    }

    const types = Array.isArray(schemaType) ? schemaType : [schemaType]

    // Collect constraint errors for types that matched
    let constraintError: ValidationResult | null = null

    for (const type of types) {
        const result = matchType(type, input, schema)

        if (result === null) {
            // Type didn't match, try next type
            continue
        }

        if (result.valid) {
            // Type matched and constraints passed
            return null
        }

        // Type matched but constraints failed - save error
        // Keep first constraint error (most relevant)
        if (!constraintError) {
            constraintError = result
        }
    }

    // If we have a constraint error, return it (type matched but constraints failed)
    if (constraintError) {
        return constraintError
    }

    // No type matched at all
    return {
        valid: false,
        error: `Expected ${types.join(" | ")}, got ${getTypeName(input)}`
    }
}


/** Validates input against a single type and its constraints */
function matchType(type: string, input: unknown, schema: Schema): ValidationResult | null {
    switch (type) {
        case "string":
            if (typeof input !== "string") return null // Type doesn't match, try next
            return validateStringConstraints(input, schema as JsonSchemaString)

        case "number":
        case "integer":
            if (typeof input !== "number") return null
            if (type === "integer" && !Number.isInteger(input)) return null
            return validateNumberConstraints(input, schema as JsonSchemaNumber)

        case "boolean":
            if (typeof input !== "boolean") return null
            return { valid: true }

        case "null":
            if (input !== null) return null
            return { valid: true }

        case "array":
            if (!Array.isArray(input)) return null
            return { valid: true } // Array item validation happens elsewhere

        case "object":
            if (typeof input !== "object" || input === null || Array.isArray(input)) return null
            return { valid: true } // Property validation happens elsewhere

        default:
            return { valid: true } // Unknown type, allow
    }
}

/**
 * Validates string-specific constraints.
 */
function validateStringConstraints(input: string, schema: JsonSchemaString): ValidationResult {
    if (schema.minLength !== undefined && input.length < schema.minLength) {
        return {
            valid: false,
            error: `String must be at least ${schema.minLength} characters, got ${input.length}`
        }
    }
    if (schema.maxLength !== undefined && input.length > schema.maxLength) {
        return {
            valid: false,
            error: `String must be at most ${schema.maxLength} characters, got ${input.length}`
        }
    }
    if (schema.enum !== undefined && !schema.enum.includes(input)) {
        return {
            valid: false,
            error: `Value must be one of: ${schema.enum.join(', ')}`
        }
    }
    if (schema.pattern !== undefined) {
        try {
            const regex = new RegExp(schema.pattern)
            if (!regex.test(input)) {
                return {
                    valid: false,
                    error: `String must match pattern: ${schema.pattern}`
                }
            }
        } catch {
            console.warn(`Invalid regex pattern: ${schema.pattern}`)
        }
    }
    return { valid: true }
}

/**
 * Validates number-specific constraints.
 */
function validateNumberConstraints(input: number, schema: JsonSchemaNumber): ValidationResult {
    if (schema.minimum !== undefined && input < schema.minimum) {
        return {
            valid: false,
            error: `Number must be >= ${schema.minimum}, got ${input}`
        }
    }
    if (schema.maximum !== undefined && input > schema.maximum) {
        return {
            valid: false,
            error: `Number must be <= ${schema.maximum}, got ${input}`
        }
    }
    if (schema.exclusiveMinimum !== undefined && input <= schema.exclusiveMinimum) {
        return {
            valid: false,
            error: `Number must be > ${schema.exclusiveMinimum}, got ${input}`
        }
    }
    if (schema.exclusiveMaximum !== undefined && input >= schema.exclusiveMaximum) {
        return {
            valid: false,
            error: `Number must be < ${schema.exclusiveMaximum}, got ${input}`
        }
    }
    if (schema.enum !== undefined && !schema.enum.includes(input)) {
        return {
            valid: false,
            error: `Value must be one of: ${schema.enum.join(', ')}`
        }
    }
    return { valid: true }
}

/**
 * Gets a human-readable type name for error messages.
 */
function getTypeName(value: unknown) {
    if (value === null) return "null"
    if (Array.isArray(value)) return "array"
    return typeof value
}