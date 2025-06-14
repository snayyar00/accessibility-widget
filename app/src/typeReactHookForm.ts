import { DeepMap, FieldError } from 'react-hook-form';

export interface ReactHookFormType {
  onSubmit?: (event: React.SyntheticEvent<HTMLFormElement>) => Promise<void>;
  register: (instance: HTMLInputElement | null) => void;
  errors?: DeepMap<Record<string, unknown>, FieldError>;
  formErrors?: DeepMap<Record<string, unknown>, FieldError>;
  trigger?: (name?: string | string[]) => Promise<boolean>;
}

// isSubmitted?: boolean;
// isSubmitting?: boolean;
// apiError?: string;