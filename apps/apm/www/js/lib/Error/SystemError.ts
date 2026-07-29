export class SystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SystemError';
  }
}

export class ValidationError extends SystemError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError'
  }
}

export class OperationalError extends SystemError {
  constructor(message: string) {
    super(message);
    this.name = 'OperationalError'
  }
}

export class NetworkError extends OperationalError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError'
  }
}

export class InvalidDataStructureError extends ValidationError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDataStructureError'
  }
}

export class ConflictError extends SystemError {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError'
  }
}