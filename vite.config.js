import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import Components from 'unplugin-vue-components/vite';
import { PrimeVueResolver } from '@primevue/auto-import-resolver';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const enableVueDevTools = env.ENABLE_VUE_DEVTOOLS === 'true';

    const plugins = [
        vue(),
        tailwindcss(),
        Components({
            resolvers: [
                PrimeVueResolver({
                    components: {
                        prefix: 'P'
                    }
                })
            ],
            dts: 'src/components.d.ts'
        })
    ];

    if (enableVueDevTools) {
        plugins.push(vueDevTools());
    }

    return {
        base: 'flowsheets',
        plugins,
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url))
            }
        },
        server: {
            host: true
        },
        build: {
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[extname]'
            }
        },
        test: {
            globals: true,
            environment: 'jsdom'
        }
    };
});
