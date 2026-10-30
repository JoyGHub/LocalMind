import { Config } from '@stencil/core';
import dotenv from 'dotenv';

dotenv.config();

export const config: Config = {
  globalStyle: 'src/global/app.css',
  globalScript: 'src/global/app.ts',
  taskQueue: 'async',
  namespace: 'localmind',
  env: {
    TAVILY_API_KEY: process.env.TAVILY_API_KEY || process.env.VITE_TAVILY_API_KEY,
  },
  outputTargets: [
    {
      type: 'dist',
      esmLoaderPath: '../loader',
    },
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
    },
    {
      type: 'docs-readme',
    },
    {
      type: 'www',
      serviceWorker: null,
      copy: [
        {
          src: 'assets',
          dest: 'assets',
        },
        {
          src: '../node_modules/@shoelace-style/shoelace/dist/assets',
          dest: 'assets/shoelace',
        },
        {
          src: '../node_modules/pdfjs-dist/build/pdf.worker.min.js',
          dest: 'assets/pdf.worker.min.js',
        },
        {
          src: '../node_modules/maplibre-gl/dist/maplibre-gl.css',
          dest: 'assets/maplibre-gl.css',
        },
      ],
    },
  ],
};
