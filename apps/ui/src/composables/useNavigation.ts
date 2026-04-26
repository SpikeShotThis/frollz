import { computed } from 'vue';
import { useRouter } from 'vue-router';

export interface NavItem {
  label: string;
  to: string;
  icon?: string;
  children?: NavItem[];
}

export function useNavigation() {
  const router = useRouter();

  const navigationTree = computed<NavItem[]>(() => {
    const routes = router.getRoutes();

    // Filter routes for navigation
    const navRoutes = routes.filter(route =>
      route.meta.showInNav === true &&
      route.meta.layout === 'app' &&
      !route.path.includes(':') // exclude dynamic routes like [id]
    );

    // Group by parent
    const rootItems: NavItem[] = [];
    const childrenByParent = new Map<string, NavItem[]>();

    for (const route of navRoutes) {
      const navItem: NavItem = {
        label: String(route.meta.title ?? route.name ?? route.path),
        to: route.path,
        ...(route.meta.icon && { icon: route.meta.icon }),
      };

      const parent = route.meta.navParent;
      if (parent) {
        if (!childrenByParent.has(parent)) {
          childrenByParent.set(parent, []);
        }
        childrenByParent.get(parent)!.push(navItem);
      } else {
        rootItems.push(navItem);
      }
    }

    // Sort children by order
    for (const children of childrenByParent.values()) {
      children.sort((a, b) => {
        const routeA = navRoutes.find(r => r.path === a.to);
        const routeB = navRoutes.find(r => r.path === b.to);
        const orderA = routeA?.meta.order ?? 999;
        const orderB = routeB?.meta.order ?? 999;
        return Number(orderA) - Number(orderB);
      });
    }

    // Attach children to parents
    for (const item of rootItems) {
      const parentKey = item.to.split('/').filter(Boolean)[0]; // e.g., '/film' -> 'film'
      if (parentKey) {
        const children = childrenByParent.get(parentKey);
        if (children && children.length > 0) {
          item.children = children;
        }
      }
    }

    // Sort root items by order
    rootItems.sort((a, b) => {
      const routeA = navRoutes.find(r => r.path === a.to);
      const routeB = navRoutes.find(r => r.path === b.to);
      const orderA = routeA?.meta.order ?? 999;
      const orderB = routeB?.meta.order ?? 999;
      return Number(orderA) - Number(orderB);
    });

    return rootItems;
  });

  return { navigationTree };
}
