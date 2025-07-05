import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT, // e.g. https://<accountid>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function saveReportToR2(key: string, json: any) {
  try {
    console.log('💾 Saving report to R2 with key:', key);
    console.log('📄 Report data structure being saved:', {
      hasAxe: !!json.axe,
      hasHtmlcs: !!json.htmlcs,
      hasByFunctions: !!json.ByFunctions,
      ByFunctionsLength: json.ByFunctions?.length || 0,
      hasScore: !!json.score,
      hasTotalElements: !!json.totalElements,
      hasIssues: !!json.issues,
      issuesLength: json.issues?.length || 0
    });
    
    const jsonString = JSON.stringify(json);
    console.log('📊 JSON string length:', jsonString.length);
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      Body: jsonString,
      ContentType: 'application/json',
    });
    
    await s3.send(command);
    console.log('✅ Successfully saved report to R2');
  } catch (error) {
    console.error('❌ Error saving report to R2:', error);
    throw error;
  }
}

export async function fetchReportFromR2(key: string) {
  try {
    console.log('📥 Fetching report from R2 with key:', key);
    
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
    });
    
    const response = await s3.send(command);
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    
    const jsonString = Buffer.concat(chunks).toString('utf-8');
    console.log('📊 Retrieved JSON string length:', jsonString.length);
    
    const parsedData = JSON.parse(jsonString);
    
    console.log('📦 Retrieved report data structure:', {
      hasAxe: !!parsedData.axe,
      hasHtmlcs: !!parsedData.htmlcs,
      hasByFunctions: !!parsedData.ByFunctions,
      ByFunctionsLength: parsedData.ByFunctions?.length || 0,
      hasScore: !!parsedData.score,
      hasTotalElements: !!parsedData.totalElements,
      hasIssues: !!parsedData.issues,
      issuesLength: parsedData.issues?.length || 0
    });
    
    console.log('✅ Successfully retrieved and parsed report from R2');
    return parsedData;
  } catch (error) {
    console.error('❌ Error fetching report from R2:', error);
    throw error;
  }
}

export async function deleteReportFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
  });
  await s3.send(command);
}