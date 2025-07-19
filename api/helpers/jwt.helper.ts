import jwt, { Algorithm, JwtPayload, SignOptions } from 'jsonwebtoken'

type Payload = {
  email?: string
  name?: string
  createdAt?: string
}

const expiresInEnv = process.env.JWT_EXPIRESIN
const expiresIn = expiresInEnv && !isNaN(Number(expiresInEnv)) ? Number(expiresInEnv) : expiresInEnv

const signOptions: SignOptions = {
  issuer: process.env.JWT_ISSUER,
  subject: process.env.JWT_SUBJECT,
  audience: process.env.JWT_AUDIENCE,
  expiresIn: expiresIn as SignOptions['expiresIn'],
  algorithm: process.env.JWT_ALGORITHM as Algorithm,
}

function sign(payload: Payload): string {
  return jwt.sign({ user: payload }, process.env.JWT_SECRET as string, signOptions)
}

function verify(token: string): string | JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET as string)
}

export { sign, verify }
