import Validator, { ValidationError } from 'fastest-validator';
import { validateNameField, validateEmailNotAlias } from '~/utils/sanitization.helper';

type LoginInfo = {
  email: string;
  password: string;
};

type RegisterInfo = {
  email: string;
  password: string;
  name: string;
};

type ChangePasswordInfo = {
  password: string;
};

type ProfileUpdateInfo = {
  name: string;
  company?: string;
  position?: string;
};

function loginValidation(data: LoginInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator();
  const schema = {
    email: { type: 'email', max: 100 },
    password: { type: 'string', min: 6, max: 50 },
  };
  return validator.validate(data, schema);
}

function registerValidation(data: RegisterInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator();
  const schema = {
    email: { 
      type: 'email',
      max: 100,
      custom: (value: string) => {
        if (!validateEmailNotAlias(value)) {
          return [{ type: 'custom', message: 'Email addresses with + symbol are not allowed' }];
        }
        return true;
      },
    },
    password: { type: 'string', min: 6, max: 50 },
    name: { 
      type: 'string', 
      empty: false,
      max: 100,
      custom: (value: string) => {
        if (!validateNameField(value)) {
          return [{ type: 'custom', message: 'Name contains invalid characters or links' }];
        }
        return true;
      },
    },
  };
  return validator.validate(data, schema);
}

function changePasswordValidation(data: ChangePasswordInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator();
  const schema = {
    password: {
      type: 'string',
      min: 6,
      max: 50,
      optional: true,
      empty: false,
    },
  };
  return validator.validate(data, schema);
}

function profileUpdateValidation(data: ProfileUpdateInfo): true | ValidationError[] | Promise<true | ValidationError[]> {
  const validator = new Validator();
  const schema = {
    name: { 
      type: 'string', 
      empty: false,
      max: 100,
      custom: (value: string) => {
        if (!validateNameField(value)) {
          return [{ type: 'custom', message: 'Name contains invalid characters or links' }];
        }
        return true;
      },
    },
    company: { type: 'string', optional: true, max: 100 },
    position: { type: 'string', optional: true, max: 100 },
  };
  return validator.validate(data, schema);
}

export { loginValidation, registerValidation, changePasswordValidation, profileUpdateValidation };
