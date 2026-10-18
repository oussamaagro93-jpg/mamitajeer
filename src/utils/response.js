const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    errors: [],
  });
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors,
  });
};

module.exports = { sendSuccess, sendError };
