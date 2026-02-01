import { categorizeError, ErrorType } from '@/lib/utils/error-categorization'

describe('categorizeError', () => {
  test('categorizes XML parse errors', () => {
    const error = new Error('XML parse error: unexpected close tag')
    const result = categorizeError(error)

    expect(result.type).toBe(ErrorType.PARSE_ERROR)
    expect(result.message).toBe('Invalid TEI format')
    expect(result.description).toBeDefined()
  })

  test('categorizes network errors', () => {
    const error = new Error('Network request failed')
    const result = categorizeError(error)

    expect(result.type).toBe(ErrorType.NETWORK_ERROR)
    expect(result.message).toBe('Connection failed')
    expect(result.action).toBeDefined()
  })

  test('categorizes file read errors', () => {
    const error = new Error('Failed to read file')
    const result = categorizeError(error)

    expect(result.type).toBe(ErrorType.FILE_ERROR)
    expect(result.message).toBe('Failed to read file')
  })

  test('categorizes validation errors', () => {
    const error = new Error('Validation failed: missing required tags')
    const result = categorizeError(error)

    expect(result.type).toBe(ErrorType.VALIDATION_ERROR)
    expect(result.message).toBe('Invalid document')
  })

  test('returns unknown error for unrecognized types', () => {
    const error = new Error('Something unexpected happened')
    const result = categorizeError(error)

    expect(result.type).toBe(ErrorType.UNKNOWN_ERROR)
    expect(result.message).toBe('An error occurred')
  })

  test('handles errors with undefined message', () => {
    const error = new Error()
    const result = categorizeError(error)

    expect(result.type).toBe(ErrorType.UNKNOWN_ERROR)
    expect(result.message).toBe('An error occurred')
    expect(result.description).toBe('Please try again.')
  })
})
