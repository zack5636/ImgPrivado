import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        compressImage: resolve(__dirname, 'comprimir-imagen/index.html'),
        resizeImage: resolve(__dirname, 'redimensionar-imagen/index.html'),
        cropImage: resolve(__dirname, 'recortar-imagen/index.html'),
        convertImage: resolve(__dirname, 'convertir-imagen/index.html'),
        removeMetadata: resolve(__dirname, 'quitar-metadatos/index.html'),
        rotateImage: resolve(__dirname, 'rotar-imagen/index.html'),
        blog: resolve(__dirname, 'blog/index.html'),
        blogCompress: resolve(__dirname, 'blog/comprimir-imagenes-para-web/index.html'),
        blogFormats: resolve(__dirname, 'blog/jpg-png-webp-diferencias/index.html'),
        blogPrivacy: resolve(__dirname, 'blog/privacidad-imagenes-navegador/index.html'),
        about: resolve(__dirname, 'sobre-nosotros/index.html'),
        howItWorks: resolve(__dirname, 'como-funciona/index.html'),
        faq: resolve(__dirname, 'faq/index.html'),
        contact: resolve(__dirname, 'contacto/index.html'),
        privacy: resolve(__dirname, 'privacidad/index.html'),
        cookies: resolve(__dirname, 'cookies/index.html'),
        terms: resolve(__dirname, 'terminos/index.html'),
        notFound: resolve(__dirname, '404.html')
      }
    }
  }
});
