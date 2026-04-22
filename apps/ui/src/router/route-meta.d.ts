import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean;
    layout?: 'app' | 'auth';
    title?: string;
    icon?: 'dashboard' | 'film' | 'devices' | 'emulsions';
    order?: number;
    showInNav?: boolean;
    navGroup?: string;
    navKey?: string;
  }
}
