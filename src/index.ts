import { generator, GeneratorResult } from 'raml-generator'

import gitignoreTemplate from './templates/.gitignore'
import composerTemplate from './templates/composer.json'
import readmeTemplate from './templates/README.md'
import classesPhpTemplate from './templates/classes.php'
import indexTemplate from './templates/index.js'
import clientTemplate from './templates/client.php'
import handlerTemplate from './templates/oauth2.php'
import providerTemplate from './templates/tokenprovider.php'

export const client = generator({
  templates: {
    '.gitignore': gitignoreTemplate,
    'composer.json': composerTemplate,
    'README.md': readmeTemplate,
    'classes.php': classesPhpTemplate,
    'index.js': indexTemplate,
    'src/Client.php': clientTemplate,
    'src/OAuth2Handler.php': handlerTemplate,
    'src/TokenProvider.php': providerTemplate
  }
});
