import { generator, Generator, GeneratorResult } from 'raml-generator'

import gitignoreTemplate from './templates/.gitignore'
import composerTemplate from './templates/composer.json'
import readmeTemplate from './templates/README.md'
import classesPhpTemplate from './templates/classes.php'
import modelsPhpTemplate from './templates/models.php'
import testsPhpTemplate from './templates/RequestBuilderTest.php'
import clientTemplate from './templates/client.php'
import handlerTemplate from './templates/oauth2.php'
import providerTemplate from './templates/tokenprovider.php'

export const client = generator({
  templates: {
    '.gitignore': gitignoreTemplate,
    'composer.json': composerTemplate,
    'README.md': readmeTemplate,
    'classes.php': classesPhpTemplate,
    'models.php': modelsPhpTemplate,
    'tests/RequestBuilderTest.php': testsPhpTemplate,
    'src/Client.php': clientTemplate,
    'src/OAuth2Handler.php': handlerTemplate,
    'src/TokenProvider.php': providerTemplate
  }
});
