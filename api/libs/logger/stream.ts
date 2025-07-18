import fs from 'fs';
import path from 'path';

// Environment-based logging control - FIXED
const isDevelopment = process.env.NODE_ENV === 'development';

let accessLogStream: fs.WriteStream | null;

if (!isDevelopment) {
  // Only create file stream in production
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  
  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  accessLogStream = fs.createWriteStream(
    path.join(logsDir, `${env}.log`),
    { flags: 'a' },
  );
} else {
  // In development, don't create file stream (Morgan will use console)
  accessLogStream = null;
}

export default accessLogStream;
