import Validator, { ValidationError } from 'fastest-validator';
import { validateEmailNotAlias } from '~/utils/sanitization.helper';

export function emailValidation(email: string, maxLength = 100): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator();
  
  const schema = {
    email: { 
      type: 'email',
      max: maxLength,
      custom: (value: string) => {
        if (!validateEmailNotAlias(value)) {
          return [{ type: 'custom', message: 'Invalid email address' }];
        }

        return true;
      }
    },
  }

  return validator.validate({ email }, schema);
}

