import { generator, Generator, GeneratorResult, Templates, Files } from 'raml-generator'

import gitignoreTemplate from './templates/.gitignore'
import composerTemplate from './templates/composer.json'
import readmeTemplate from './templates/README.md'
import classesPhpTemplate from './templates/classes.php'
import modelPhpTemplate from './templates/model.php'
import modelCollectionPhpTemplate from './templates/modelcollection.php'
import testsPhpTemplate from './templates/RequestBuilderTest.php'
import clientTemplate from './templates/client.php'
import handlerTemplate from './templates/oauth2.php'
import providerTemplate from './templates/tokenprovider.php'
import jsonObjectPhpTemplate from './templates/jsonobject.php'
import collectionPhpTemplate from './templates/collection.php'
import mapperPhpTemplate from './templates/mapper.php'
import hydratorGeneratorPhpTemplate from './templates/hydratorgenerator.php'

export const client = generator({
  templates: {
    '.gitignore': gitignoreTemplate,
    'composer.json': composerTemplate,
    'README.md': readmeTemplate,
    'classes.php': classesPhpTemplate,
    'tests/RequestBuilderTest.php': testsPhpTemplate,
    'src/Client.php': clientTemplate,
    'src/Model/JsonObject.php': jsonObjectPhpTemplate,
    'src/Model/Collection.php': collectionPhpTemplate,
    'src/Model/Mapper.php': mapperPhpTemplate,
    'src/Model/HydratorGenerator.php': hydratorGeneratorPhpTemplate,
    'src/OAuth2Handler.php': handlerTemplate,
    'src/TokenProvider.php': providerTemplate,
    'model': modelPhpTemplate,
    'modelcollection': modelCollectionPhpTemplate,
  },
  generate: dynamicTemplates
});

/**
 * Compile templates into files.
 */
function dynamicTemplates(templates: Templates, api: any, data: any) {
  const files: Files = {};
  Object.keys(templates).forEach(function (key) {
    switch (key) {
      case 'modelcollection':
        if (api.types) {
          const displayNames:any  = getDisplayNames(api.types);
          const discriminatorList:any = getDiscriminatorTypes(api.types, displayNames);
          for (const typeKey of Object.keys(api.types)) {
            const typeDef = api.types[typeKey];
            const typeName = Object.keys(typeDef)[0];
            const fileName = `src/Model/${typeDef[typeName].name}Collection.php`;
            const d:any = data ? data : {};
            d.type = typeDef[typeName];
            d.displayNames = displayNames;
            d.discriminatorList = discriminatorList;
            if (files[fileName]) {
              console.log('already exists: ' + fileName);
            }
            if (d.type.annotations && d.type.annotations['generate-collection']) {
              console.log("Generating collection:" + fileName);
              files[fileName] = templates[key](api, d);
            }
          }
        }
        break;
      case 'model':
        if (api.types) {
          const displayNames:any  = getDisplayNames(api.types);
          const discriminatorList:any = getDiscriminatorTypes(api.types, displayNames);
          for (const typeKey of Object.keys(api.types)) {
            const typeDef = api.types[typeKey];
            const typeName = Object.keys(typeDef)[0];
            const fileName = `src/Model/${typeDef[typeName].name}.php`;
            const d: any = data ? data : {};
            d.type = typeDef[typeName];
            d.displayNames = displayNames;
            d.discriminatorList = discriminatorList;
            if (files[fileName]) {
              console.log('already exists: ' + fileName);
            }
            console.log("Generating model:" + fileName);
            files[fileName] = templates[key](api,  d);
          }
        }
        break;
      default:
        files[key] = templates[key](api, data);
        break;
    }
  });

  return files
}

function getDisplayNames(types: any) {
  const displayNames:any = {};
  if (types) {
    for (const key of Object.keys(types)) {
      const typeDef = types[key];
      const typeName = Object.keys(typeDef)[0];
      const type = typeDef[typeName];
      displayNames[typeName] = type.name;
      if (type.annotations && type.annotations['generate-collection']) {
        displayNames[typeName + 'Collection'] = type.name + 'Collection';
      }
    }
  }
  return displayNames;
}

function getDiscriminatorTypes(types: any, displayNames: any) {
  const discriminatorTypes:any = {};
  if (types) {
    for (const key of Object.keys(types)) {
      const typeDef = types[key];
      const typeName = Object.keys(typeDef)[0];
      const type = typeDef[typeName];
      const displayName = displayNames[type.type];
      if (type.discriminatorValue) {
        if (!discriminatorTypes[displayName]) {
          discriminatorTypes[displayName] = [];
        }
        discriminatorTypes[displayName].push({ discriminatorValue: type.discriminatorValue, type: type.name });
      }
    }
  }
  return discriminatorTypes;
}
