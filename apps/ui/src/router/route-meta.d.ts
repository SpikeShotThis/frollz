import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    layout?: 'app' | 'auth';
    title?: string;
    icon?: 'dashboard' | 'film' | 'receivers' | 'emulsions';
    order?: number;
    showInNav?: boolean;
    navGroup?: string;
    navKey?: string;
  }
}
