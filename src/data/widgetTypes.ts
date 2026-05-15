export const widgetTypes = [
  'text',
  'qr',
  'datetime',
  'image',
  'weather',
  'forecast',
] as const;

export type WidgetType = (typeof widgetTypes)[number];

export const defaultPoster = {
  version: 1,
  name: 'Mi pantalla digital',
  pages: [
    {
      id: 'page-1',
      name: 'Página 1',
      duration: 10,
      background: '#101827',
      widgets: [
        {
          id: 'widget-title',
          type: 'text',
          x: 8,
          y: 10,
          w: 44,
          h: 18,
          text: 'Bienvenido',
          color: '#ffffff',
          fontSize: 72,
          fontFamily: 'system-ui',
          bold: true,
          italic: false,
          letterSpacing: 0,
        },
        {
          id: 'widget-clock',
          type: 'datetime',
          x: 56,
          y: 10,
          w: 34,
          h: 16,
          format: 'datetime',
          color: '#dbeafe',
          fontSize: 36,
        },
      ],
    },
  ],
};
