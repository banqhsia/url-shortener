class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
  }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400); }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(message, 404); }
}

class ConflictError extends AppError {
  constructor(message) { super(message, 409); }
}

module.exports = { AppError, ValidationError, NotFoundError, ConflictError };
