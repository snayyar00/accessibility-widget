import { NextFunction, Request, Response } from 'express'

export function validateBody(validator: (body: any) => any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validateResult = validator(req.body)

    if (Array.isArray(validateResult) && validateResult.length) {
      return res.status(400).json({ error: validateResult.map((it: any) => it.message).join(',') })
    }
    next()
  }
}

export function validateQuery(validator: (query: any) => any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validateResult = validator(req.query)

    if (Array.isArray(validateResult) && validateResult.length) {
      return res.status(400).json({ error: validateResult.map((it: any) => it.message).join(',') })
    }

    next()
  }
}

export function validateParams(validator: (params: any) => any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validateResult = validator(req.params)

    if (Array.isArray(validateResult) && validateResult.length) {
      return res.status(400).json({ error: validateResult.map((it: any) => it.message).join(',') })
    }

    next()
  }
}
