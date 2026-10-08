/** The row doesn't exist, is soft-deleted, or belongs to another user (deliberately indistinguishable). */
export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}

/** A business rule was broken (e.g. expense posted to an income category). Message is user-safe. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}
