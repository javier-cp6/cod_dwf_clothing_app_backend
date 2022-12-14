import { PrismaConnector } from "../prisma.js";
import bcryptjs from 'bcryptjs';
import cryptoJs from "crypto-js";
import jwt from "jsonwebtoken";

import { 
  userRequestDTO, 
  changePasswordRequestDTO,
  loginRequestDTO,
} from "../dtos/users.dtos.js";
import { validateEmail, notifyNewPassword } from "../utils/emails.js";

const { compareSync } = bcryptjs;

export const getUsers = async (req, res)=> {
  try {
    const users = await PrismaConnector.user.findMany({
      include: {
        addresses: true,
        carts: true,
      }
    });
    return res.json(users)
  } catch (error) {
    return res.status(400).json({
      message: 'Something went wrong while getting users',
      result: error.message
    })
  }
}

export const postUser = async (req, res) => {
  try {
    const { password, ...data } = userRequestDTO(req.body);
    const encryptedPassword = bcryptjs.hashSync(password, 10);

    const result = await PrismaConnector.user.create({ 
      data: { ...data, password: encryptedPassword }
    })

    const currentDate = new Date();

    const token = cryptoJs.AES.encrypt(
      JSON.stringify({
        id: result.id,
        expirationDate: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate(),
          currentDate.getHours() + 2
        ),
      }),
      process.env.ENCRYPTION_KEY
    ).toString();

    await validateEmail({
      recipient: result.email,
      name: result.name,
      lastname: result.lastname,
      token,
    });

    return res.status(201).json({
      message: "User created successfully",
      result
    })
  } catch (error) {
    return res.status(400).json({
      message: "Something went wrong while creating user",
      result: error.message
    })
  }
}

export const validateUser = async (req, res) => {
  const { token } = req.body;
  try {
    const data = cryptoJs.AES.decrypt(
      token,
      process.env.ENCRYPTION_KEY
    ).toString(cryptoJs.enc.Utf8);
    // console.log(data);

    if (!data) {
      throw new Error("Invalid token");
    }

    const infoToken = JSON.parse(data);
    // console.log(infoToken);

    if (infoToken.expirationDate < new Date()) {
      throw new Error("Expired token");
    }

    const user = await PrismaConnector.user.findUniqueOrThrow({
      where: { id: infoToken.id },
    });

    if (user.validated) {
      throw new Error("User already validated");
    }

    await PrismaConnector.user.update({
      data: { validated: true },
      where: { id: infoToken.id },
    });

    return res.json({
      message: "User validated successfully",
      result: null,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Something went wrong while validating token",
      result: error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const data = changePasswordRequestDTO(req.body);

    const user = await PrismaConnector.user.findUniqueOrThrow({
      where: { email: data.email },
    });
    if (bcryptjs.compareSync(data.currentPassword, user.password)) {
      const newPassword = bcryptjs.hashSync(data.newPassword);

      await PrismaConnector.user.update({
        data: {
          password: newPassword,
        },
        where: {
          email: data.email,
        },
      });

      await notifyNewPassword({
        recipient: user.email,
        name: user.name,
        lastname: user.lastname
      });
      return res.json({
        message: "Password changed successfully",
        result: null,
      });
    } else {
      throw new Error("Incorrect password");
    }
  } catch (error) {
    return res.json({
      message: "Something went wrong while changing password",
      result: error.message,
    });
  }
};

export const login = async (req, res) => {
  const { body } = req;
  try {
    const data = loginRequestDTO(body);

    const user = await PrismaConnector.user.findUniqueOrThrow({
      where: { email: data.email },
    });

    if (compareSync(data.password, user.password)) {
      const token = jwt.sign(
        {
          id: user.id,
          message: "Token message",
        },
        process.env.JWT_KEY,
        { expiresIn: "2h" }
      );

      return res.json({
        message: "Welcome!",
        result: token,
      });
    } else {
      throw new Error("Invalid email or password");
    }
  } catch (error) {
    return res.status(400).json({
      message: "Something went wrong while logging in",
      result: error.message,
    });
  }
};

export const profile = async (req, res) => {
  const { password, ...result } = req.user;
  return res.json({
    message: null,
    result,
  });
};
