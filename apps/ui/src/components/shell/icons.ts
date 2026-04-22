import { defineComponent, h, type Component } from 'vue';

function createIcon(path: string, viewBox = '0 0 24 24'): Component {
  return defineComponent({
    name: 'ShellIcon',
    render() {
      return h(
        'svg',
        {
          xmlns: 'http://www.w3.org/2000/svg',
          viewBox,
          fill: 'none',
          stroke: 'currentColor',
          'stroke-width': '1.75',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round'
        },
        [h('path', { d: path })]
      );
    }
  });
}

export const DashboardIcon = createIcon('M3 12h8V3H3zm10 9h8v-6h-8zm0-8h8V3h-8zM3 21h8v-7H3z');
export const FilmIcon = createIcon('M4 6h16v12H4zM8 6v12M16 6v12M4 10h4M16 10h4M4 14h4M16 14h4');
export const ReceiverIcon = createIcon('M5 8h14v11H5zM9 8V5h6v3M12 12h.01');
export const EmulsionIcon = createIcon('M12 3s6 6.4 6 11a6 6 0 1 1-12 0c0-4.6 6-11 6-11z');
export const CollapseIcon = createIcon('M9 5l-5 7 5 7M20 5v14');
export const ExpandIcon = createIcon('M15 5l5 7-5 7M4 5v14');
export const MenuIcon = createIcon('M4 7h16M4 12h16M4 17h16');
