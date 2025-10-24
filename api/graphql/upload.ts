/**
 * Wrapper for graphql-upload ES modules
 * Provides synchronous access to async-imported graphql-upload types
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _GraphQLUpload: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _Upload: any = null

export async function initializeGraphQLUpload() {
  try {
    const uploadModule = await import('graphql-upload/GraphQLUpload.mjs')
    const uploadTypeModule = await import('graphql-upload/Upload.mjs')

    _GraphQLUpload = uploadModule.default
    _Upload = uploadTypeModule.default

    console.log('[INFO] ✅ GraphQL Upload modules initialized successfully')
  } catch (error) {
    console.error('[ERROR] Failed to initialize graphql-upload:', error)
    throw error
  }
}

// Getter functions that must be called at runtime
export const getGraphQLUploadType = () => {
  if (!_GraphQLUpload) {
    throw new Error('GraphQLUpload not initialized. Call initializeGraphQLUpload() first.')
  }
  return _GraphQLUpload
}

export const getUploadType = () => {
  if (!_Upload) {
    throw new Error('Upload not initialized. Call initializeGraphQLUpload() first.')
  }
  return _Upload
}

// For backward compatibility - these will be accessed at runtime
export const GraphQLUpload = getGraphQLUploadType
export const Upload = getUploadType
