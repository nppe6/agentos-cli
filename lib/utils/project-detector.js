const fs = require('fs');
const path = require('path');
const { readJsonFile } = require('./json');

const FRONTEND_INDICATORS = [
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.ts',
  'next.config.mjs',
  'nuxt.config.ts',
  'nuxt.config.js',
  'webpack.config.js',
  'rollup.config.js',
  'svelte.config.js',
  'astro.config.mjs',
  'angular.json',
  'vue.config.js',
  'src/App.tsx',
  'src/App.jsx',
  'src/App.vue',
  'src/app/page.tsx',
  'app/page.tsx',
  'pages/index.tsx',
  'pages/index.jsx'
];

const BACKEND_INDICATORS = [
  'go.mod',
  'go.sum',
  'Cargo.toml',
  'Cargo.lock',
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  'Pipfile',
  'poetry.lock',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Gemfile',
  'composer.json',
  '*.csproj',
  '*.fsproj',
  'mix.exs',
  'server.ts',
  'server.js',
  'src/server.ts',
  'src/server.js',
  'src/index.ts',
  'src/index.js'
];

const FRONTEND_DEPS = [
  '@angular/core',
  '@remix-run/react',
  'angular',
  'astro',
  'lit',
  'next',
  'nuxt',
  'preact',
  'react',
  'solid-js',
  'svelte',
  'vue'
];

const BACKEND_DEPS = [
  '@nestjs/core',
  'django',
  'express',
  'fastapi',
  'fastify',
  'flask',
  'hapi',
  'hono',
  'koa',
  'nest'
];

function detectProjectType(targetDirectory) {
  const target = path.resolve(targetDirectory);
  const hasFrontendFiles = FRONTEND_INDICATORS.some((file) => fileExists(target, file));
  const hasBackendFiles = BACKEND_INDICATORS.some((file) => fileExists(target, file));
  const { hasFrontend, hasBackend } = checkPackageJson(target);

  const isFrontend = hasFrontendFiles || hasFrontend;
  const isBackend = hasBackendFiles || hasBackend;

  if (isFrontend && isBackend) {
    return 'fullstack';
  }
  if (isFrontend) {
    return 'frontend';
  }
  if (isBackend) {
    return 'backend';
  }

  return 'unknown';
}

function fileExists(target, filename) {
  if (filename.includes('*')) {
    const directory = path.join(target, path.dirname(filename));
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      return false;
    }

    const basename = path.basename(filename);
    const regex = new RegExp(`^${escapeRegExp(basename).replace(/\\\*/g, '.*')}$`);
    return fs.readdirSync(directory).some((file) => regex.test(file));
  }

  return fs.existsSync(path.join(target, filename));
}

function checkPackageJson(target) {
  const packageJsonPath = path.join(target, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return { hasBackend: false, hasFrontend: false };
  }

  try {
    const packageJson = readJsonFile(packageJsonPath);
    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {})
    };
    const names = Object.keys(dependencies);

    return {
      hasBackend: BACKEND_DEPS.some((dependency) => names.includes(dependency)),
      hasFrontend: FRONTEND_DEPS.some((dependency) => names.includes(dependency))
    };
  }
  catch {
    return { hasBackend: false, hasFrontend: false };
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  detectProjectType
};
