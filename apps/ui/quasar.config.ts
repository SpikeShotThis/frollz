import { configure } from 'quasar/wrappers';
import { fileURLToPath } from 'node:url';

export default configure((ctx: any) => {
  return {
    css: ['app.scss'],
    extras: ['material-icons'],
    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20'
      },
      vueRouterMode: 'history',
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@frollz2/schema': fileURLToPath(new URL('../../packages/schema/dist/index.js', import.meta.url))
      }
    },
    devServer: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    },
    framework: {
      config: {

        brand: {
          primary: '#403d39',
          secondary: '#ccc5b9',
          accent: '#eb5e28',

          dark: '#8c867d',
          'dark-page': '#252422',

          positive: '#4a7c59',
          negative: '#f25c54',
          info: '#b0a1ba',
          warning: '#f7b267'
        }
        ,
        notify: {
          position: 'top-right',
          timeout: 2500
        }
      },
      plugins: ['Notify', 'Dialog', 'Loading']
    }
  };
});
