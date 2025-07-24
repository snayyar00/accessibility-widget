import 'dotenv/config';
import { CodegenConfig } from '@graphql-codegen/cli';

const SCHEMA_URL = process.env.REACT_APP_GRAPHQL_URL;

const config: CodegenConfig = {
  schema: SCHEMA_URL,
  documents: 'src/queries/**/*.ts',
  generates: {
    'src/generated/': {
      preset: 'client',
      plugins: [],
    },
  },
  hooks: {},
};

export default config;
