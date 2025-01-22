export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // Handle Prisma Validation Errors
  if (err.code === "P2002") {
    err.statusCode = 400;
    err.message = `Duplicate value for ${err.meta.target.join(
      ", "
    )}. Please use another value.`;
  }

  // Handle Prisma Foreign Key Constraint Errors
  if (err.code === "P2003") {
    err.statusCode = 400;
    err.message = `Invalid reference: ${err.meta.field_name}`;
  }

  // Handle Prisma Record Not Found
  if (err.code === "P2001") {
    err.statusCode = 404;
    err.message = "Record not found";
  }

  // Kafka Connection Errors
  if (err.name === "KafkaJSConnectionError") {
    err.statusCode = 503;
    err.message = "Unable to connect to message broker";
  }

  const errorResponse = {
    status: err.status,
    message: err.message,
  };

  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
    errorResponse.error = err;
  }

  res.status(err.statusCode).json(errorResponse);
};
