// src/middleware/errorHandler.js
import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;

  // Log del error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Errores de Sequelize
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map(e => e.message).join('. ');
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Ya existe un registro con esos datos.';
  }

  // No exponer detalles en producción
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'Algo salió mal. Por favor intenta nuevamente.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
