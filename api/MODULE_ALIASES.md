# Module Aliases Configuration

This project uses dynamic module aliases that change based on the environment.

## How it works

The `module-aliases.js` file in the project root handles setting up module aliases dynamically:

- In **development** mode, the `~` alias points to the project root folder (`.`)
- In **production** mode, the `~` alias points to the compiled output folder (`./dist`)

## Environment Detection

The environment is detected through the `NODE_ENV` environment variable. This is set:

1. Through npm scripts in package.json
2. From your system environment variables
3. Defaults to 'development' if not set

## Importing Files

When importing files in your code, you can use the `~` alias to reference from the project root:

```typescript
// This will work in both development and production
import something from '~/path/to/file';
```

## Adding New Aliases

To add new aliases, modify the `module-aliases.js` file and add entries to the aliases object:

```javascript
moduleAlias.addAliases({
  '~': basePath,
  '@models': path.join(basePath, 'models'),
  // Add more aliases here
});
``` 