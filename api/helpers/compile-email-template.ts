import handlebars from 'handlebars';
import mjml2html from 'mjml';
import fs from 'fs';
import path from 'path';
import logger from '~/utils/logger';

type Props = {
  fileName: string;
  data: {
    date?: string;
    name?: string;
    url?: string;
    teamName?: string;
    link?: string;
  }
};

export default async function compileEmailTemplate({ fileName, data }: Props): Promise<string> {
  try {
    // Adjust the path to look in the original email-templates directory
    const mjmlPath = path.join(process.cwd(), 'email-templates', fileName);
    logger.info(`Attempting to read MJML file from: ${mjmlPath}`);
    
    const mjmlContent = await fs.promises.readFile(mjmlPath, 'utf8');
    
    const { html, errors } = mjml2html(mjmlContent, {
      keepComments: false,
      beautify: false,
      minify: true,
    });

    if (errors && errors.length > 0) {
      logger.warn('MJML compilation warnings:', errors);
    }

    const template = handlebars.compile(html);
    return template(data);
  } catch (error) {
    logger.error('Error compiling email template:', error);
    throw error;
  }
}
