#!/usr/bin/env node
declare var require: any;
declare var process: any;
import { bin } from 'raml-generator/bin'
import { client } from './index'
var pkg = require('../package.json');

bin(client, pkg, process.argv)
