import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { v4 as uuidv4 } from 'uuid'

import { ORGANIZATION_MANAGEMENT_ROLES } from '../../constants/organization.constant'
import { updateOrganization } from '../../repository/organization.repository'
import { canManageOrganization } from '../../utils/access.helper'
import { ApolloError } from '../../utils/graphql-errors.helper'
import { UserLogined } from '../authentication/get-user-logined.service'

export interface FileUploadResolved {
  filename: string
  mimetype: string
  encoding: string
  createReadStream: () => Readable
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const MAX_LOGO_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FAVICON_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_LOGO_TYPES = ['image/png', 'image/svg+xml']
const ALLOWED_FAVICON_TYPES = ['image/png', 'image/svg+xml']

async function uploadToR2(stream: Readable, key: string, contentType: string): Promise<string> {
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(chunk as Buffer)
  }

  const buffer = Buffer.concat(chunks)
  const bucket = process.env.R2_PUBLIC_BUCKET

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  })

  await s3.send(command)

  if (process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL}/${key}`
  }

  throw new ApolloError('R2_PUBLIC_URL not configured. Please set R2_PUBLIC_URL in environment variables or enable public access on your R2 bucket.')
}

export async function uploadOrganizationLogo(organizationId: number, file: FileUploadResolved, user: UserLogined): Promise<string> {
  await checkOrganizationUploadAccess(user, organizationId)
  await validateImageUpload(file, MAX_LOGO_SIZE, ALLOWED_LOGO_TYPES)

  const { createReadStream, filename, mimetype } = file
  const stream = createReadStream()

  const ext = filename.split('.').pop()
  const uniqueFilename = `organizations/${organizationId}/logo-${uuidv4()}.${ext}`

  const originalUrl = await uploadToR2(stream, uniqueFilename, mimetype)

  await updateOrganization(organizationId, { logo_url: originalUrl })

  return originalUrl
}

export async function uploadOrganizationFavicon(organizationId: number, file: FileUploadResolved, user: UserLogined): Promise<string> {
  await checkOrganizationUploadAccess(user, organizationId)
  await validateImageUpload(file, MAX_FAVICON_SIZE, ALLOWED_FAVICON_TYPES)

  const { createReadStream, filename, mimetype } = file
  const stream = createReadStream()

  const ext = filename.split('.').pop()
  const uniqueFilename = `organizations/${organizationId}/favicon-${uuidv4()}.${ext}`

  const originalUrl = await uploadToR2(stream, uniqueFilename, mimetype)

  await updateOrganization(organizationId, { favicon: originalUrl })

  return originalUrl
}

async function validateImageUpload(file: FileUploadResolved, maxSize: number, allowedTypes: string[]): Promise<void> {
  const { mimetype } = file

  if (!allowedTypes.includes(mimetype)) {
    throw new ApolloError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`)
  }
}

async function checkOrganizationUploadAccess(user: UserLogined, organizationId: number): Promise<void> {
  if (user.is_super_admin) return

  if (user.current_organization_id !== organizationId) {
    throw new ApolloError('You can only upload files to your current organization')
  }

  const orgUser = user.currentOrganizationUser
  const isAllowed = orgUser && canManageOrganization(orgUser.role)

  if (!isAllowed) {
    throw new ApolloError(`Only ${ORGANIZATION_MANAGEMENT_ROLES.join(', ')} can upload organization files`)
  }
}
