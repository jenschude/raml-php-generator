import { generator, GeneratorResult } from 'raml-generator'

import gitignoreTemplate from './templates/.gitignore'
import composerTemplate from './templates/composer.json'
import readmeTemplate from './templates/README.md'
import indexPhpTemplate from './templates/index.php'
import indexTemplate from './templates/index.js'

export const client = generator({
  templates: {
    '.gitignore': gitignoreTemplate,
    'composer.json': composerTemplate,
    'README.md': readmeTemplate,
    'index.php': indexPhpTemplate,
    'index.js': indexTemplate,
  }
})
