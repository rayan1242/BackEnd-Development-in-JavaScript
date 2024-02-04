const { StatusCodes } = require("http-status-codes");
const { UserRepository, RoleRepository } = require("../repositories");
const AppError = require("../utils/errors/app-error");
const { Auth, Enums } = require("../utils/common");
const userRepo = new UserRepository();

async function signup(data) {
  try {
    const user = await userRepo.create(data);
    return user;
  } catch (error) {
    if (
      error.name == "SequelizeValidationError" ||
      error.name == "SequelizeUniqueConstraintError"
    ) {
      let explanation = [];
      error.errors.forEach((err) => {
        explanation.push(err.message);
      });
      throw new AppError(explanation, StatusCodes.BAD_REQUEST);
    }
    throw new AppError(
      "Cannot create a new User Object!",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}
async function signin(data) {
  try {
    const user = await userRepo.getUserByEmail(data.email);
    if (!user) {
      // check if the user exists/not
      throw new AppError(
        "For the given email address, no users were found",
        StatusCodes.NOT_FOUND
      );
    }
    const passwordMatch = Auth.checkPassword(data.password, user.password); // if the password is valid/not
    if (!passwordMatch) {
      throw new AppError("Password is invalid", StatusCodes.BAD_REQUEST);
    }
    const jwt = Auth.createToken({ id: user.id, email: user.email }); // creating a JWT Token and returning it to the client
    return jwt;
  } catch (error) {
    if (error instanceof AppError) throw error; // If it is an object of AppError then throw the error directly from here.
    throw new AppError(
      "While signing in, something went wrong",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

async function isAuthenticated(token) {
  try {
    if (!token) {
      throw new AppError("Missing JWT Token", StatusCodes.BAD_REQUEST);
    }
    const response = Auth.verifyToken(token);
    const user = await userRepo.get(response.id);
    if (!user) {
      // Suppose the user account is deleted and the hacker is trying to pretend to be the user, so check if the user id is present in the database or not.
      throw new AppError(
        "For the given JWT token, no users were found",
        StatusCodes.NOT_FOUND
      );
    }
    return user.id;
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error.name == "JsonWebTokenError") {
      throw new AppError("Invalid JWT Token", StatusCodes.BAD_REQUEST);
    }
    if (error.name == "TokenExpiredError") {
      throw new AppError("JWT Token Expired", StatusCodes.BAD_REQUEST);
    }
    throw new AppError(
      "INTERNAL SERVER ERROR | Something went wrong",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
}

module.exports = {
  signup,
  signin,
  isAuthenticated,
};
