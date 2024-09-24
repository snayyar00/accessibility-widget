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
    // Construct the path to the email template outside the dist folder
    const mjmlPath = path.resolve(process.cwd(), 'api', 'email-templates', fileName);
    logger.info(`Current working directory: ${process.cwd()}`);
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
