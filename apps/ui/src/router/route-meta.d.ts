import 'vue-router';

declare module 'vue-router' {
  type AppNavIconKey = 'dashboard' | 'film' | 'devices' | 'emulsions';
  type DeviceTypeFilterCode = 'camera' | 'film_holder' | 'interchangeable_back';
  type DevelopmentProcessFilterCode = 'BW' | 'BWReversal' | 'ECN2' | 'C41' | 'E6';

  interface RouteMeta {
    public?: boolean;
    layout?: 'app' | 'auth';
    title?: string;
    icon?: AppNavIconKey;
    order?: number;
    showInNav?: boolean;
    navGroup?: string;
    navParent?: string;
    navKey?: string;
    deviceTypeFilter?: DeviceTypeFilterCode;
    developmentProcessFilter?: DevelopmentProcessFilterCode;
    filmFormatFilters?: string[];
  }
}
