export enum ErrorType {
  PARSE_ERROR = 'parse_error',
  FILE_ERROR = 'file_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface ErrorInfo {
  type: ErrorType
  message: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function categorizeError(error: Error): ErrorInfo {
  const message = (error.message || '').toLowerCase()

  // Parse errors (most specific - check first)
  if (
    message.includes('xml') ||
    message.includes('parse') ||
    message.includes('unexpected token')
  ) {
    return {
      type: ErrorType.PARSE_ERROR,
      message: 'Invalid TEI format',
      description: 'Unable to parse the XML document. Please check the file format and try again.',
    }
  }

  // Network errors (check before file errors to avoid misclassification)
  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection')
  ) {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Connection failed',
      description: 'Please check your internet connection and try again.',
      action: {
        label: 'Retry',
        onClick: () => {
          // Retry logic will be implemented by caller
          console.log('Retry action clicked')
        },
      },
    }
  }

  // File errors (more specific - after network check)
  if (
    message.includes('file') ||
    message.includes('encoding') ||
    (message.includes('read') && message.includes('file'))
  ) {
    return {
      type: ErrorType.FILE_ERROR,
      message: 'Failed to read file',
      description: 'The file could not be read. Please check it is a valid TEI XML file.',
    }
  }

  // Validation errors
  if (
    message.includes('validation') ||
    message.includes('required') ||
    message.includes('missing')
  ) {
    return {
      type: ErrorType.VALIDATION_ERROR,
      message: 'Invalid document',
      description: 'The document is missing required tags or structure.',
    }
  }

  // Default fallback
  return {
    type: ErrorType.UNKNOWN_ERROR,
    message: 'An error occurred',
    description: error.message || 'Please try again.',
  }
}
