// Auto-generated Theme Registry reverse-engineered directly from getangie.com

export interface FrameHole {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameTheme {
  id: string;
  label: string;
  category: string;
  bg: string;
  slot: string;
  sub?: string;
  fg?: string;
  border?: boolean;
  frame?: boolean;
  shape?: 'rect' | 'circle';
  noFooter?: boolean;
  holes?: {
    vertical?: FrameHole[];
    grid?: FrameHole[];
    duo?: FrameHole[];
    polaroid?: FrameHole[];
  };
  img?: {
    vertical?: string;
    grid?: string;
    duo?: string;
    polaroid?: string;
  };
}

export interface ThemeCategory {
  id: string;
  label: string;
  sub: string;
  iconName: string;
  isNew?: boolean;
  isCozy?: boolean;
}

export const THEME_CATEGORIES: ThemeCategory[] = [
  { id: 'simple', label: 'Simple', sub: 'solid colors', iconName: 'Palette' },
  { id: 'patterns', label: 'Patterns', sub: 'prints & scenes', iconName: 'Sparkles' },
  { id: 'coquette', label: 'Coquette', sub: 'bows & hearts', iconName: 'Heart', isNew: true },
  { id: 'treats', label: 'Sweet Dates', sub: 'boba, matcha & dessert', iconName: 'Coffee', isNew: true },
  { id: 'journal', label: 'Scrapbook', sub: 'taped & doodled', iconName: 'BookOpen', isNew: true },
  { id: 'collage', label: 'Collage', sub: 'themed layouts', iconName: 'LayoutGrid' },
  { id: 'travel', label: 'Travel', sub: "places we've been", iconName: 'Plane' },
  { id: 'food', label: 'Food', sub: 'everything we ate', iconName: 'Utensils' },
  { id: 'fall', label: 'Fall', sub: 'sweater weather', iconName: 'Leaf' },
  { id: 'winter', label: 'Winter', sub: 'snow & lights', iconName: 'Snowflake' },
  { id: 'cozy', label: 'Cozy Frames', sub: 'soft & homey', iconName: 'Coffee', isCozy: true },
  { id: 'namsan', label: 'Namsan', sub: 'dinner at the tower', iconName: 'Lock' },
  { id: 'birthday', label: 'Birthday', sub: 'make a wish', iconName: 'Cake' },
  { id: 'justus', label: 'Just Us', sub: 'two shots each', iconName: 'Heart' },
];

export const ALL_THEMES: FrameTheme[] = [
  {
    "id": "black",
    "label": "black",
    "category": "simple",
    "bg": "#17181C",
    "slot": "#26282f",
    "sub": "rgba(255,255,255,0.55)",
    "fg": "#ffffff",
    "img": {}
  },
  {
    "id": "white",
    "label": "white",
    "category": "simple",
    "bg": "#FFFFFF",
    "slot": "#eef0f4",
    "sub": "rgba(23,24,28,0.5)",
    "fg": "#17181C",
    "border": true,
    "img": {}
  },
  {
    "id": "cream",
    "label": "cream",
    "category": "simple",
    "bg": "#F2E8D5",
    "slot": "#e2d4b9",
    "sub": "rgba(107,87,58,0.6)",
    "fg": "#6b573a",
    "img": {}
  },
  {
    "id": "pink",
    "label": "pink",
    "category": "simple",
    "bg": "#FAD4E2",
    "slot": "#f1b9ce",
    "sub": "rgba(140,63,94,0.6)",
    "fg": "#8c3f5e",
    "img": {}
  },
  {
    "id": "blue",
    "label": "blue",
    "category": "simple",
    "bg": "#D3E4FA",
    "slot": "#b9d2f1",
    "sub": "rgba(53,83,126,0.6)",
    "fg": "#35537e",
    "img": {}
  },
  {
    "id": "mint",
    "label": "mint",
    "category": "simple",
    "bg": "#D6EEE0",
    "slot": "#badfcc",
    "sub": "rgba(53,96,80,0.6)",
    "fg": "#356050",
    "img": {}
  },
  {
    "id": "slate",
    "label": "slate",
    "category": "simple",
    "bg": "#5B6166",
    "slot": "#6d737a",
    "sub": "rgba(255,255,255,0.55)",
    "fg": "#ffffff",
    "img": {}
  },
  {
    "id": "teddy",
    "label": "teddy",
    "category": "patterns",
    "bg": "#FBF1E6",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(138,106,78,0.65)",
    "fg": "#8a6a4e",
    "img": {
      "vertical": "/assets/themes/teddy-v.webp",
      "grid": "/assets/themes/teddy-g.webp"
    }
  },
  {
    "id": "hearts",
    "label": "hearts",
    "category": "patterns",
    "bg": "#FBEDDD",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(184,56,46,0.6)",
    "fg": "#b8382e",
    "img": {
      "vertical": "/assets/themes/hearts-v.webp",
      "grid": "/assets/themes/hearts-g.webp"
    }
  },
  {
    "id": "cherry",
    "label": "cherry",
    "category": "patterns",
    "bg": "#F3EDDD",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(178,58,74,0.6)",
    "fg": "#b23a4a",
    "img": {
      "vertical": "/assets/themes/cherry-v.webp"
    }
  },
  {
    "id": "gingham",
    "label": "gingham",
    "category": "patterns",
    "bg": "#DFE8CF",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(85,112,60,0.65)",
    "fg": "#55703c",
    "img": {
      "vertical": "/assets/themes/gingham-v.webp",
      "grid": "/assets/themes/gingham-g.webp"
    }
  },
  {
    "id": "dots",
    "label": "dots",
    "category": "patterns",
    "bg": "#FDF6DC",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(185,92,133,0.6)",
    "fg": "#b95c85",
    "img": {
      "vertical": "/assets/themes/dots-v.webp"
    }
  },
  {
    "id": "lemonade",
    "label": "lemonade",
    "category": "patterns",
    "bg": "#EDF3FA",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(74,107,150,0.6)",
    "fg": "#4a6b96",
    "img": {
      "vertical": "/assets/themes/lemonade-v.webp"
    }
  },
  {
    "id": "tulips",
    "label": "tulips",
    "category": "patterns",
    "bg": "#DCE8DA",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(60,90,72,0.65)",
    "fg": "#3c5a48",
    "img": {
      "vertical": "/assets/themes/tulips-v.webp"
    }
  },
  {
    "id": "denim",
    "label": "denim",
    "category": "patterns",
    "bg": "#232F4B",
    "slot": "rgba(255,255,255,0.25)",
    "sub": "rgba(255,255,255,0.6)",
    "fg": "#ffffff",
    "img": {
      "vertical": "/assets/themes/denim-v.webp",
      "grid": "/assets/themes/denim-g.webp"
    }
  },
  {
    "id": "meadow",
    "label": "meadow",
    "category": "patterns",
    "bg": "#A8CBB4",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(47,90,51,0.65)",
    "fg": "#2f5a33",
    "img": {
      "vertical": "/assets/themes/meadow-v.webp"
    }
  },
  {
    "id": "checker",
    "label": "checker",
    "category": "patterns",
    "bg": "#D9E4F2",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(70,104,156,0.6)",
    "fg": "#46689c",
    "img": {
      "vertical": "/assets/themes/checker-v.webp"
    }
  },
  {
    "id": "stripes",
    "label": "stripes",
    "category": "patterns",
    "bg": "#F2D9E2",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(95,122,64,0.6)",
    "fg": "#5f7a40",
    "img": {
      "vertical": "/assets/themes/stripes-v.webp"
    }
  },
  {
    "id": "rosy",
    "label": "rosy",
    "category": "patterns",
    "bg": "#FAD9E2",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(168,78,110,0.6)",
    "fg": "#a84e6e",
    "img": {
      "grid": "/assets/themes/rosy-g.webp"
    }
  },
  {
    "id": "plaid",
    "label": "plaid",
    "category": "patterns",
    "bg": "#C9D3F2",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(70,87,158,0.6)",
    "fg": "#46579e",
    "img": {
      "grid": "/assets/themes/plaid-g.webp"
    }
  },
  {
    "id": "picnic",
    "label": "picnic",
    "category": "patterns",
    "bg": "#E8B49A",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(178,84,44,0.6)",
    "fg": "#b2542c",
    "img": {
      "grid": "/assets/themes/picnic-g.webp"
    }
  },
  {
    "id": "sunny",
    "label": "sunny",
    "category": "patterns",
    "bg": "#FBF3C9",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(156,127,44,0.6)",
    "fg": "#9c7f2c",
    "img": {
      "grid": "/assets/themes/sunny-g.webp"
    }
  },
  {
    "id": "sky",
    "label": "sky",
    "category": "patterns",
    "bg": "#7FB8E0",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(44,91,136,0.6)",
    "fg": "#2c5b88",
    "img": {
      "grid": "/assets/themes/sky-g.webp"
    }
  },
  {
    "id": "stars",
    "label": "stars",
    "category": "patterns",
    "bg": "#A9C4E4",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(74,107,156,0.6)",
    "fg": "#4a6b9c",
    "img": {
      "grid": "/assets/themes/stars-g.webp"
    }
  },
  {
    "id": "tartan",
    "label": "tartan",
    "category": "patterns",
    "bg": "#F2DEE6",
    "slot": "rgba(255,255,255,0.72)",
    "sub": "rgba(156,95,120,0.6)",
    "fg": "#9c5f78",
    "img": {
      "grid": "/assets/themes/tartan-g.webp"
    }
  },
  {
    "id": "buttercup",
    "label": "buttercup",
    "category": "patterns",
    "bg": "#FFF9C2",
    "slot": "rgba(255,255,255,0.6)",
    "sub": "rgba(179,80,107,0.62)",
    "fg": "#B3506B",
    "img": {
      "vertical": "/assets/themes/buttercup-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8817,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "sage",
    "label": "sage",
    "category": "patterns",
    "bg": "#BCC7BA",
    "slot": "rgba(255,255,255,0.6)",
    "sub": "rgba(74,90,73,0.62)",
    "fg": "#4A5A49",
    "img": {
      "vertical": "/assets/themes/sage-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0567,
          "y": 0.0194,
          "w": 0.8867,
          "h": 0.2072
        },
        {
          "x": 0.0567,
          "y": 0.2428,
          "w": 0.885,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.4656,
          "w": 0.885,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.885,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "inkdot",
    "label": "inkdot",
    "category": "patterns",
    "bg": "#FFFFFF",
    "slot": "rgba(26,34,52,0.12)",
    "sub": "rgba(26,34,52,0.6)",
    "fg": "#1A2234",
    "img": {
      "vertical": "/assets/themes/inkdot-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0567,
          "y": 0.0194,
          "w": 0.8867,
          "h": 0.2072
        },
        {
          "x": 0.0567,
          "y": 0.2428,
          "w": 0.885,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.4656,
          "w": 0.885,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.885,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "burlap",
    "label": "burlap",
    "category": "patterns",
    "bg": "#FFF3AE",
    "slot": "rgba(255,255,255,0.6)",
    "sub": "rgba(107,74,46,0.62)",
    "fg": "#6B4A2E",
    "img": {
      "vertical": "/assets/themes/burlap-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0467,
          "y": 0.4633,
          "w": 0.895,
          "h": 0.2089
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.8833,
          "h": 0.2117
        }
      ]
    }
  },
  {
    "id": "honey",
    "label": "honey",
    "category": "patterns",
    "bg": "#FFF4D8",
    "slot": "rgba(255,255,255,0.65)",
    "sub": "rgba(27,42,122,0.62)",
    "fg": "#1B2A7A",
    "img": {
      "vertical": "/assets/themes/honey-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0567,
          "y": 0.02,
          "w": 0.8867,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.2428,
          "w": 0.885,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.4656,
          "w": 0.885,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.885,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "blooming",
    "label": "blooming",
    "category": "coquette",
    "bg": "#F1E2E7",
    "slot": "rgba(126,74,92,0.15)",
    "sub": "rgba(126,74,92,0.64)",
    "fg": "#7E4A5C",
    "img": {
      "vertical": "/assets/themes/coquette-blooming-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1333,
          "y": 0.0833,
          "w": 0.7334,
          "h": 0.1834
        },
        {
          "x": 0.1333,
          "y": 0.2888,
          "w": 0.7334,
          "h": 0.1835
        },
        {
          "x": 0.1333,
          "y": 0.4944,
          "w": 0.7334,
          "h": 0.1834
        },
        {
          "x": 0.1333,
          "y": 0.7,
          "w": 0.7334,
          "h": 0.1834
        }
      ]
    }
  },
  {
    "id": "xoxo",
    "label": "xoxo",
    "category": "coquette",
    "bg": "#F4E6EA",
    "slot": "rgba(154,90,112,0.15)",
    "sub": "rgba(154,90,112,0.64)",
    "fg": "#9A5A70",
    "img": {
      "vertical": "/assets/themes/coquette-xoxo-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0666,
          "y": 0.0888,
          "w": 0.6334,
          "h": 0.1907
        },
        {
          "x": 0.3,
          "y": 0.2833,
          "w": 0.6334,
          "h": 0.1906
        },
        {
          "x": 0.0666,
          "y": 0.4777,
          "w": 0.6334,
          "h": 0.1907
        },
        {
          "x": 0.3,
          "y": 0.6722,
          "w": 0.6334,
          "h": 0.1906
        }
      ]
    }
  },
  {
    "id": "film",
    "label": "film",
    "category": "coquette",
    "bg": "#141315",
    "slot": "rgba(255,255,255,0.14)",
    "sub": "rgba(243,211,221,0.72)",
    "fg": "#F3D3DD",
    "img": {
      "vertical": "/assets/themes/coquette-film-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1333,
          "y": 0.0833,
          "w": 0.7334,
          "h": 0.1779
        },
        {
          "x": 0.1333,
          "y": 0.2777,
          "w": 0.7334,
          "h": 0.1779
        },
        {
          "x": 0.1333,
          "y": 0.4722,
          "w": 0.7334,
          "h": 0.1778
        },
        {
          "x": 0.1333,
          "y": 0.6666,
          "w": 0.7334,
          "h": 0.1779
        }
      ]
    }
  },
  {
    "id": "butter",
    "label": "butter",
    "category": "coquette",
    "bg": "#FFF3D8",
    "slot": "rgba(107,78,46,0.15)",
    "sub": "rgba(107,78,46,0.64)",
    "fg": "#6B4E2E",
    "img": {
      "vertical": "/assets/themes/coquette-butter-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1333,
          "y": 0.0388,
          "w": 0.7334,
          "h": 0.2201
        },
        {
          "x": 0.1,
          "y": 0.2777,
          "w": 0.8,
          "h": 0.1668
        },
        {
          "x": 0.1,
          "y": 0.4611,
          "w": 0.8,
          "h": 0.1667
        },
        {
          "x": 0.1,
          "y": 0.6444,
          "w": 0.8,
          "h": 0.1668
        }
      ]
    }
  },
  {
    "id": "cowprint",
    "label": "cowprint",
    "category": "coquette",
    "bg": "#C68DA1",
    "slot": "rgba(94,47,66,0.15)",
    "sub": "rgba(94,47,66,0.64)",
    "fg": "#5E2F42",
    "img": {
      "vertical": "/assets/themes/coquette-cowprint-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1166,
          "y": 0.1144,
          "w": 0.7668,
          "h": 0.1657
        },
        {
          "x": 0.1166,
          "y": 0.2922,
          "w": 0.7668,
          "h": 0.1656
        },
        {
          "x": 0.1166,
          "y": 0.47,
          "w": 0.7668,
          "h": 0.1656
        },
        {
          "x": 0.1166,
          "y": 0.6477,
          "w": 0.7668,
          "h": 0.1657
        }
      ]
    }
  },
  {
    "id": "daydream",
    "label": "daydream",
    "category": "coquette",
    "bg": "#F6EDF4",
    "slot": "rgba(142,106,154,0.15)",
    "sub": "rgba(142,106,154,0.64)",
    "fg": "#8E6A9A",
    "img": {
      "vertical": "/assets/themes/coquette-daydream-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1,
          "y": 0.05,
          "w": 0.8,
          "h": 0.1667
        },
        {
          "x": 0.1,
          "y": 0.2277,
          "w": 0.8,
          "h": 0.1668
        },
        {
          "x": 0.1,
          "y": 0.4055,
          "w": 0.8,
          "h": 0.1668
        },
        {
          "x": 0.1,
          "y": 0.5833,
          "w": 0.8,
          "h": 0.1667
        }
      ]
    }
  },
  {
    "id": "blush",
    "label": "blush",
    "category": "coquette",
    "bg": "#F1E0E5",
    "slot": "rgba(140,80,104,0.15)",
    "sub": "rgba(140,80,104,0.64)",
    "fg": "#8C5068",
    "img": {
      "grid": "/assets/themes/coquette-blush-g.webp"
    },
    "frame": true,
    "holes": {
      "grid": [
        {
          "x": 0.2333,
          "y": 0.0466,
          "w": 0.2634,
          "h": 0.3551
        },
        {
          "x": 0.5033,
          "y": 0.0466,
          "w": 0.2634,
          "h": 0.3551
        },
        {
          "x": 0.2538,
          "y": 0.4116,
          "w": 0.2429,
          "h": 0.3518
        },
        {
          "x": 0.5033,
          "y": 0.4116,
          "w": 0.2429,
          "h": 0.3518
        }
      ]
    }
  },
  {
    "id": "laceheart",
    "label": "laceheart",
    "category": "coquette",
    "bg": "#FAF4EC",
    "slot": "rgba(142,84,104,0.15)",
    "sub": "rgba(142,84,104,0.64)",
    "fg": "#8E5468",
    "img": {
      "grid": "/assets/themes/coquette-laceheart-g.webp"
    },
    "frame": true,
    "holes": {
      "grid": [
        {
          "x": 0.2333,
          "y": 0.0466,
          "w": 0.2634,
          "h": 0.3551
        },
        {
          "x": 0.5033,
          "y": 0.0466,
          "w": 0.2634,
          "h": 0.3551
        },
        {
          "x": 0.2538,
          "y": 0.4116,
          "w": 0.2429,
          "h": 0.3518
        },
        {
          "x": 0.5033,
          "y": 0.4116,
          "w": 0.2429,
          "h": 0.3518
        }
      ]
    }
  },
  {
    "id": "mooved",
    "label": "mooved",
    "category": "coquette",
    "bg": "#C68DA1",
    "slot": "rgba(94,47,66,0.15)",
    "sub": "rgba(94,47,66,0.64)",
    "fg": "#5E2F42",
    "img": {
      "grid": "/assets/themes/coquette-mooved-g.webp"
    },
    "frame": true,
    "holes": {
      "grid": [
        {
          "x": 0.2333,
          "y": 0.0466,
          "w": 0.2634,
          "h": 0.3551
        },
        {
          "x": 0.5033,
          "y": 0.0466,
          "w": 0.2634,
          "h": 0.3551
        },
        {
          "x": 0.2538,
          "y": 0.4116,
          "w": 0.2429,
          "h": 0.3518
        },
        {
          "x": 0.5033,
          "y": 0.4116,
          "w": 0.2429,
          "h": 0.3518
        }
      ]
    }
  },
  {
    "id": "boba",
    "label": "boba",
    "category": "treats",
    "bg": "#F8EEE1",
    "slot": "rgba(107,78,46,0.15)",
    "sub": "rgba(107,78,46,0.64)",
    "fg": "#6B4E2E",
    "img": {
      "vertical": "/assets/themes/treats-boba-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0833,
          "y": 0.0944,
          "w": 0.5001,
          "h": 0.2001
        },
        {
          "x": 0.4166,
          "y": 0.3111,
          "w": 0.5001,
          "h": 0.2001
        },
        {
          "x": 0.0833,
          "y": 0.5277,
          "w": 0.5001,
          "h": 0.2001
        },
        {
          "x": 0.4166,
          "y": 0.7444,
          "w": 0.5001,
          "h": 0.2001
        }
      ]
    }
  },
  {
    "id": "matcha",
    "label": "matcha",
    "category": "treats",
    "bg": "#F3F1E6",
    "slot": "rgba(94,116,72,0.15)",
    "sub": "rgba(94,116,72,0.64)",
    "fg": "#5E7448",
    "img": {
      "vertical": "/assets/themes/treats-matcha-v.webp"
    },
    "frame": true,
    "shape": "circle",
    "holes": {
      "vertical": [
        {
          "x": 0.13,
          "y": 0.0877,
          "w": 0.74,
          "h": 0.169
        },
        {
          "x": 0.13,
          "y": 0.2877,
          "w": 0.74,
          "h": 0.169
        },
        {
          "x": 0.13,
          "y": 0.4877,
          "w": 0.74,
          "h": 0.169
        },
        {
          "x": 0.13,
          "y": 0.6877,
          "w": 0.74,
          "h": 0.169
        }
      ]
    }
  },
  {
    "id": "sweettooth",
    "label": "sweettooth",
    "category": "treats",
    "bg": "#F8EDEF",
    "slot": "rgba(154,90,112,0.15)",
    "sub": "rgba(154,90,112,0.64)",
    "fg": "#9A5A70",
    "img": {
      "vertical": "/assets/themes/treats-sweettooth-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1166,
          "y": 0.0833,
          "w": 0.7668,
          "h": 0.1667
        },
        {
          "x": 0.1166,
          "y": 0.2666,
          "w": 0.7668,
          "h": 0.1668
        },
        {
          "x": 0.1166,
          "y": 0.45,
          "w": 0.7668,
          "h": 0.1667
        },
        {
          "x": 0.1166,
          "y": 0.6333,
          "w": 0.7668,
          "h": 0.1667
        }
      ]
    }
  },
  {
    "id": "bobaheart",
    "label": "bobaheart",
    "category": "treats",
    "bg": "#E8DAC6",
    "slot": "rgba(90,62,43,0.15)",
    "sub": "rgba(90,62,43,0.64)",
    "fg": "#5A3E2B",
    "img": {
      "grid": "/assets/themes/treats-bobaheart-g.webp"
    },
    "frame": true,
    "holes": {
      "grid": [
        {
          "x": 0.2333,
          "y": 0.05,
          "w": 0.2634,
          "h": 0.3551
        },
        {
          "x": 0.5033,
          "y": 0.05,
          "w": 0.2634,
          "h": 0.3551
        },
        {
          "x": 0.2538,
          "y": 0.415,
          "w": 0.2429,
          "h": 0.3517
        },
        {
          "x": 0.5033,
          "y": 0.415,
          "w": 0.2429,
          "h": 0.3517
        }
      ]
    }
  },
  {
    "id": "kraft",
    "label": "kraft",
    "category": "journal",
    "bg": "#E8DAC6",
    "slot": "rgba(90,62,43,0.15)",
    "sub": "rgba(90,62,43,0.64)",
    "fg": "#5A3E2B",
    "img": {
      "vertical": "/assets/themes/journal-kraft-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1033,
          "y": 0.0822,
          "w": 0.7601,
          "h": 0.1906
        },
        {
          "x": 0.14,
          "y": 0.295,
          "w": 0.755,
          "h": 0.1878
        },
        {
          "x": 0.1066,
          "y": 0.5066,
          "w": 0.7534,
          "h": 0.1868
        },
        {
          "x": 0.1383,
          "y": 0.7166,
          "w": 0.7584,
          "h": 0.1896
        }
      ]
    }
  },
  {
    "id": "notebook",
    "label": "notebook",
    "category": "journal",
    "bg": "#FBF4F2",
    "slot": "rgba(90,54,64,0.15)",
    "sub": "rgba(90,54,64,0.64)",
    "fg": "#5A3640",
    "img": {
      "vertical": "/assets/themes/journal-notebook-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0566,
          "y": 0.035,
          "w": 0.6368,
          "h": 0.1945
        },
        {
          "x": 0.2616,
          "y": 0.265,
          "w": 0.6434,
          "h": 0.1534
        },
        {
          "x": 0.1233,
          "y": 0.4677,
          "w": 0.7534,
          "h": 0.1868
        },
        {
          "x": 0.43,
          "y": 0.6877,
          "w": 0.4734,
          "h": 0.1579
        }
      ]
    }
  },
  {
    "id": "loveletter",
    "label": "loveletter",
    "category": "journal",
    "bg": "#F1DCE1",
    "slot": "rgba(90,46,58,0.15)",
    "sub": "rgba(90,46,58,0.64)",
    "fg": "#5A2E3A",
    "img": {
      "vertical": "/assets/themes/journal-loveletter-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1066,
          "y": 0.1227,
          "w": 0.7868,
          "h": 0.1879
        },
        {
          "x": 0.1383,
          "y": 0.3261,
          "w": 0.7134,
          "h": 0.1739
        },
        {
          "x": 0.1083,
          "y": 0.5133,
          "w": 0.7834,
          "h": 0.1845
        },
        {
          "x": 0.145,
          "y": 0.715,
          "w": 0.71,
          "h": 0.17
        }
      ]
    }
  },
  {
    "id": "blanket",
    "label": "blanket",
    "category": "journal",
    "bg": "#F7F1E7",
    "slot": "rgba(90,62,74,0.15)",
    "sub": "rgba(90,62,74,0.64)",
    "fg": "#5A3E4A",
    "img": {
      "vertical": "/assets/themes/journal-blanket-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1616,
          "y": 0.0872,
          "w": 0.6768,
          "h": 0.1701
        },
        {
          "x": 0.2616,
          "y": 0.2983,
          "w": 0.5101,
          "h": 0.1701
        },
        {
          "x": 0.1616,
          "y": 0.5094,
          "w": 0.6768,
          "h": 0.1701
        },
        {
          "x": 0.1833,
          "y": 0.7138,
          "w": 0.6334,
          "h": 0.1907
        }
      ]
    }
  },
  {
    "id": "midnight",
    "label": "midnight",
    "category": "journal",
    "bg": "#262326",
    "slot": "rgba(255,255,255,0.14)",
    "sub": "rgba(244,239,230,0.72)",
    "fg": "#F4EFE6",
    "img": {
      "vertical": "/assets/themes/journal-midnight-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.11,
          "y": 0.085,
          "w": 0.7484,
          "h": 0.1862
        },
        {
          "x": 0.1216,
          "y": 0.2944,
          "w": 0.7568,
          "h": 0.189
        },
        {
          "x": 0.1116,
          "y": 0.5138,
          "w": 0.7451,
          "h": 0.184
        },
        {
          "x": 0.1233,
          "y": 0.7233,
          "w": 0.7534,
          "h": 0.1867
        }
      ]
    }
  },
  {
    "id": "gallery",
    "label": "gallery",
    "category": "collage",
    "bg": "#1F3226",
    "slot": "rgba(255,255,255,0.4)",
    "sub": "rgba(232,201,122,0.7)",
    "fg": "#E8C97A",
    "img": {
      "vertical": "/assets/themes/gallery-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.2283,
          "y": 0.0994,
          "w": 0.5517,
          "h": 0.1228
        },
        {
          "x": 0.27,
          "y": 0.3144,
          "w": 0.4583,
          "h": 0.1178
        },
        {
          "x": 0.27,
          "y": 0.5278,
          "w": 0.4683,
          "h": 0.0972
        },
        {
          "x": 0.2467,
          "y": 0.7172,
          "w": 0.5033,
          "h": 0.13
        }
      ]
    }
  },
  {
    "id": "villa",
    "label": "villa",
    "category": "collage",
    "bg": "#D8D8C8",
    "slot": "rgba(255,255,255,0.5)",
    "sub": "rgba(63,81,56,0.7)",
    "fg": "#3F5138",
    "img": {
      "vertical": "/assets/themes/villa-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1,
          "y": 0.2428,
          "w": 0.8,
          "h": 0.1356
        },
        {
          "x": 0.1,
          "y": 0.4078,
          "w": 0.8,
          "h": 0.1356
        },
        {
          "x": 0.1,
          "y": 0.5728,
          "w": 0.8,
          "h": 0.1361
        },
        {
          "x": 0.1,
          "y": 0.7378,
          "w": 0.8,
          "h": 0.1356
        }
      ]
    }
  },
  {
    "id": "bloom",
    "label": "bloom",
    "category": "collage",
    "bg": "#E8D8C8",
    "slot": "rgba(255,255,255,0.55)",
    "sub": "rgba(138,96,112,0.7)",
    "fg": "#8A6070",
    "img": {
      "vertical": "/assets/themes/bloom-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1133,
          "y": 0.0594,
          "w": 0.7667,
          "h": 0.1822
        },
        {
          "x": 0.1033,
          "y": 0.2761,
          "w": 0.76,
          "h": 0.1822
        },
        {
          "x": 0.1217,
          "y": 0.4933,
          "w": 0.7567,
          "h": 0.1817
        },
        {
          "x": 0.1233,
          "y": 0.71,
          "w": 0.755,
          "h": 0.1811
        }
      ]
    }
  },
  {
    "id": "orchid",
    "label": "orchid",
    "category": "collage",
    "bg": "#785858",
    "slot": "rgba(255,255,255,0.35)",
    "sub": "rgba(243,224,222,0.72)",
    "fg": "#F3E0DE",
    "img": {
      "vertical": "/assets/themes/orchid-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.13,
          "y": 0.0661,
          "w": 0.745,
          "h": 0.1767
        },
        {
          "x": 0.1333,
          "y": 0.2783,
          "w": 0.7417,
          "h": 0.1772
        },
        {
          "x": 0.135,
          "y": 0.4917,
          "w": 0.74,
          "h": 0.1767
        },
        {
          "x": 0.135,
          "y": 0.7056,
          "w": 0.74,
          "h": 0.1767
        }
      ]
    }
  },
  {
    "id": "scrapbook",
    "label": "scrapbook",
    "category": "collage",
    "bg": "#E8D8C8",
    "slot": "rgba(255,255,255,0.5)",
    "sub": "rgba(46,62,92,0.7)",
    "fg": "#2E3E5C",
    "img": {
      "vertical": "/assets/themes/scrapbook-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2061
        },
        {
          "x": 0.0583,
          "y": 0.2433,
          "w": 0.8833,
          "h": 0.2056
        },
        {
          "x": 0.0583,
          "y": 0.4661,
          "w": 0.8833,
          "h": 0.2056
        },
        {
          "x": 0.0583,
          "y": 0.6889,
          "w": 0.8817,
          "h": 0.2056
        }
      ]
    }
  },
  {
    "id": "lace",
    "label": "lace",
    "category": "collage",
    "bg": "#382828",
    "slot": "rgba(255,255,255,0.3)",
    "sub": "rgba(245,239,226,0.7)",
    "fg": "#F5EFE2",
    "img": {
      "vertical": "/assets/themes/lace-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2061
        },
        {
          "x": 0.0583,
          "y": 0.2433,
          "w": 0.8833,
          "h": 0.2056
        },
        {
          "x": 0.0583,
          "y": 0.4661,
          "w": 0.8833,
          "h": 0.2056
        },
        {
          "x": 0.0583,
          "y": 0.6889,
          "w": 0.8817,
          "h": 0.2056
        }
      ]
    }
  },
  {
    "id": "patch",
    "label": "patch",
    "category": "collage",
    "bg": "#6888A8",
    "slot": "rgba(255,255,255,0.45)",
    "sub": "rgba(34,54,76,0.7)",
    "fg": "#22364C",
    "img": {
      "vertical": "/assets/themes/patch-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2061
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2061
        },
        {
          "x": 0.0567,
          "y": 0.4656,
          "w": 0.885,
          "h": 0.2061
        },
        {
          "x": 0.0567,
          "y": 0.6889,
          "w": 0.8833,
          "h": 0.2056
        }
      ]
    }
  },
  {
    "id": "pocket",
    "label": "pocket",
    "category": "collage",
    "bg": "#283848",
    "slot": "rgba(255,255,255,0.3)",
    "sub": "rgba(234,240,247,0.7)",
    "fg": "#EAF0F7",
    "img": {
      "vertical": "/assets/themes/pocket-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2061
        },
        {
          "x": 0.0583,
          "y": 0.2433,
          "w": 0.8833,
          "h": 0.2056
        },
        {
          "x": 0.0583,
          "y": 0.4661,
          "w": 0.8833,
          "h": 0.2056
        },
        {
          "x": 0.0583,
          "y": 0.6889,
          "w": 0.8817,
          "h": 0.2056
        }
      ]
    }
  },
  {
    "id": "aura",
    "label": "aura",
    "category": "collage",
    "bg": "#E4E6EE",
    "slot": "rgba(96,104,130,0.16)",
    "sub": "rgba(96,104,130,0.64)",
    "fg": "#606882",
    "img": {
      "vertical": "/assets/themes/collage-aura-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.2428,
          "w": 0.885,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.4656,
          "w": 0.885,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.885,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "steel",
    "label": "steel",
    "category": "collage",
    "bg": "#99948B",
    "slot": "rgba(255,255,255,0.32)",
    "sub": "rgba(244,242,238,0.74)",
    "fg": "#F4F2EE",
    "img": {
      "vertical": "/assets/themes/collage-steel-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8817,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "drip",
    "label": "drip",
    "category": "collage",
    "bg": "#887F8A",
    "slot": "rgba(255,255,255,0.32)",
    "sub": "rgba(242,238,244,0.74)",
    "fg": "#F2EEF4",
    "img": {
      "vertical": "/assets/themes/collage-drip-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8817,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "orb",
    "label": "orb",
    "category": "collage",
    "bg": "#9A8777",
    "slot": "rgba(255,255,255,0.32)",
    "sub": "rgba(246,240,232,0.74)",
    "fg": "#F6F0E8",
    "img": {
      "vertical": "/assets/themes/collage-orb-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.885,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "japan",
    "label": "japan",
    "category": "travel",
    "bg": "#E4D4D5",
    "slot": "rgba(60,26,40,0.16)",
    "sub": "rgba(60,26,40,0.66)",
    "fg": "#3C1A28",
    "img": {
      "vertical": "/assets/themes/travel-japan-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0517,
          "y": 0.05,
          "w": 0.78,
          "h": 0.185
        },
        {
          "x": 0.1183,
          "y": 0.2761,
          "w": 0.7767,
          "h": 0.185
        },
        {
          "x": 0.0517,
          "y": 0.5006,
          "w": 0.78,
          "h": 0.1856
        },
        {
          "x": 0.265,
          "y": 0.7261,
          "w": 0.7167,
          "h": 0.1856
        }
      ]
    }
  },
  {
    "id": "france",
    "label": "france",
    "category": "travel",
    "bg": "#FCF6E4",
    "slot": "rgba(92,70,48,0.15)",
    "sub": "rgba(92,70,48,0.64)",
    "fg": "#5C4630",
    "img": {
      "vertical": "/assets/themes/travel-france-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.115,
          "y": 0.0506,
          "w": 0.7767,
          "h": 0.1856
        },
        {
          "x": 0.2517,
          "y": 0.3094,
          "w": 0.51,
          "h": 0.1189
        },
        {
          "x": 0.1183,
          "y": 0.5006,
          "w": 0.7767,
          "h": 0.1856
        },
        {
          "x": 0.1183,
          "y": 0.7261,
          "w": 0.7667,
          "h": 0.1856
        }
      ]
    }
  },
  {
    "id": "greece",
    "label": "greece",
    "category": "travel",
    "bg": "#FFFFFF",
    "slot": "rgba(0,80,144,0.14)",
    "sub": "rgba(0,80,144,0.66)",
    "fg": "#005090",
    "img": {
      "vertical": "/assets/themes/travel-greece-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1117,
          "y": 0.0522,
          "w": 0.7733,
          "h": 0.1856
        },
        {
          "x": 0.185,
          "y": 0.275,
          "w": 0.6667,
          "h": 0.1878
        },
        {
          "x": 0.115,
          "y": 0.5,
          "w": 0.775,
          "h": 0.1867
        },
        {
          "x": 0.115,
          "y": 0.725,
          "w": 0.7817,
          "h": 0.1872
        }
      ]
    }
  },
  {
    "id": "mexico",
    "label": "mexico",
    "category": "travel",
    "bg": "#FCF6E4",
    "slot": "rgba(163,35,28,0.14)",
    "sub": "rgba(163,35,28,0.66)",
    "fg": "#A3231C",
    "img": {
      "vertical": "/assets/themes/travel-mexico-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1117,
          "y": 0.05,
          "w": 0.7817,
          "h": 0.1872
        },
        {
          "x": 0.115,
          "y": 0.275,
          "w": 0.7817,
          "h": 0.1867
        },
        {
          "x": 0.115,
          "y": 0.5,
          "w": 0.7817,
          "h": 0.1872
        },
        {
          "x": 0.115,
          "y": 0.725,
          "w": 0.7817,
          "h": 0.1872
        }
      ]
    }
  },
  {
    "id": "pixelsky",
    "label": "pixelsky",
    "category": "travel",
    "bg": "#4746D8",
    "slot": "rgba(255,255,255,0.3)",
    "sub": "rgba(242,243,255,0.76)",
    "fg": "#F2F3FF",
    "img": {
      "vertical": "/assets/themes/travel-pixelsky-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.8833,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "ticket",
    "label": "ticket",
    "category": "travel",
    "bg": "#F4F5F7",
    "slot": "rgba(40,42,99,0.14)",
    "sub": "rgba(42,44,99,0.65)",
    "fg": "#2A2C63",
    "img": {
      "vertical": "/assets/themes/travel-ticket-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.105,
          "y": 0.1294,
          "w": 0.7483,
          "h": 0.1578
        },
        {
          "x": 0.105,
          "y": 0.3011,
          "w": 0.7483,
          "h": 0.1589
        },
        {
          "x": 0.105,
          "y": 0.4756,
          "w": 0.7483,
          "h": 0.1578
        },
        {
          "x": 0.105,
          "y": 0.6478,
          "w": 0.7483,
          "h": 0.1578
        }
      ]
    }
  },
  {
    "id": "sardine",
    "label": "sardine",
    "category": "food",
    "bg": "#003C9C",
    "slot": "rgba(255,255,255,0.28)",
    "sub": "rgba(242,246,255,0.76)",
    "fg": "#F2F6FF",
    "img": {
      "vertical": "/assets/themes/food-sardine-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0883,
          "y": 0.0617,
          "w": 0.82,
          "h": 0.1578
        },
        {
          "x": 0.1017,
          "y": 0.2839,
          "w": 0.82,
          "h": 0.1511
        },
        {
          "x": 0.1183,
          "y": 0.5006,
          "w": 0.7767,
          "h": 0.1856
        },
        {
          "x": 0.105,
          "y": 0.745,
          "w": 0.7433,
          "h": 0.1511
        }
      ]
    }
  },
  {
    "id": "sashimi",
    "label": "sashimi",
    "category": "food",
    "bg": "#FCF0F0",
    "slot": "rgba(196,96,80,0.14)",
    "sub": "rgba(140,86,76,0.64)",
    "fg": "#C46050",
    "img": {
      "vertical": "/assets/themes/food-sashimi-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.115,
          "y": 0.0506,
          "w": 0.7767,
          "h": 0.1856
        },
        {
          "x": 0.1183,
          "y": 0.2761,
          "w": 0.7767,
          "h": 0.185
        },
        {
          "x": 0.1183,
          "y": 0.5006,
          "w": 0.7767,
          "h": 0.1783
        },
        {
          "x": 0.1183,
          "y": 0.7261,
          "w": 0.7767,
          "h": 0.1856
        }
      ]
    }
  },
  {
    "id": "snacks",
    "label": "snacks",
    "category": "food",
    "bg": "#D8CCCC",
    "slot": "rgba(150,100,110,0.16)",
    "sub": "rgba(150,100,110,0.64)",
    "fg": "#96646E",
    "img": {
      "vertical": "/assets/themes/food-snacks-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.065,
          "y": 0.1494,
          "w": 0.87,
          "h": 0.2022
        },
        {
          "x": 0.065,
          "y": 0.3717,
          "w": 0.87,
          "h": 0.2033
        },
        {
          "x": 0.065,
          "y": 0.595,
          "w": 0.87,
          "h": 0.2022
        }
      ]
    }
  },
  {
    "id": "pantry",
    "label": "pantry",
    "category": "food",
    "bg": "#F0D8C0",
    "slot": "rgba(170,70,50,0.14)",
    "sub": "rgba(130,84,64,0.64)",
    "fg": "#AA4632",
    "img": {
      "vertical": "/assets/themes/food-pantry-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1917,
          "y": 0.0683,
          "w": 0.63,
          "h": 0.15
        },
        {
          "x": 0.1683,
          "y": 0.2861,
          "w": 0.6667,
          "h": 0.1578
        },
        {
          "x": 0.2717,
          "y": 0.5361,
          "w": 0.4567,
          "h": 0.1056
        },
        {
          "x": 0.215,
          "y": 0.7339,
          "w": 0.6533,
          "h": 0.1689
        }
      ]
    }
  },
  {
    "id": "udon",
    "label": "udon",
    "category": "food",
    "bg": "#F0F0F0",
    "slot": "rgba(90,100,120,0.14)",
    "sub": "rgba(90,100,120,0.62)",
    "fg": "#5A6478",
    "img": {
      "vertical": "/assets/themes/food-udon-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.115,
          "y": 0.0506,
          "w": 0.7767,
          "h": 0.1856
        },
        {
          "x": 0.1183,
          "y": 0.2761,
          "w": 0.7767,
          "h": 0.185
        },
        {
          "x": 0.1183,
          "y": 0.5006,
          "w": 0.7767,
          "h": 0.1856
        },
        {
          "x": 0.1183,
          "y": 0.7261,
          "w": 0.7767,
          "h": 0.1856
        }
      ]
    }
  },
  {
    "id": "dessert",
    "label": "dessert",
    "category": "food",
    "bg": "#F5E4D8",
    "slot": "rgba(160,110,80,0.14)",
    "sub": "rgba(120,84,64,0.64)",
    "fg": "#8C5A3C",
    "img": {
      "vertical": "/assets/themes/food-dessert-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.155,
          "y": 0.0622,
          "w": 0.6683,
          "h": 0.1528
        },
        {
          "x": 0.1117,
          "y": 0.265,
          "w": 0.7333,
          "h": 0.1889
        },
        {
          "x": 0.165,
          "y": 0.5172,
          "w": 0.6667,
          "h": 0.1533
        },
        {
          "x": 0.0617,
          "y": 0.7083,
          "w": 0.8333,
          "h": 0.1889
        }
      ]
    }
  },
  {
    "id": "pumpkin",
    "label": "pumpkin",
    "category": "fall",
    "bg": "#EFE0D0",
    "slot": "rgba(196,100,42,0.14)",
    "sub": "rgba(120,80,55,0.65)",
    "fg": "#C4642A",
    "img": {
      "vertical": "/assets/themes/fall-pumpkin-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1133,
          "y": 0.05,
          "w": 0.7783,
          "h": 0.1867
        },
        {
          "x": 0.1167,
          "y": 0.275,
          "w": 0.78,
          "h": 0.1867
        },
        {
          "x": 0.1167,
          "y": 0.5144,
          "w": 0.7517,
          "h": 0.155
        },
        {
          "x": 0.115,
          "y": 0.7256,
          "w": 0.78,
          "h": 0.1856
        }
      ]
    }
  },
  {
    "id": "forest",
    "label": "forest",
    "category": "fall",
    "bg": "#B4795A",
    "slot": "rgba(255,255,255,0.32)",
    "sub": "rgba(255,244,234,0.75)",
    "fg": "#FFF4EA",
    "img": {
      "vertical": "/assets/themes/fall-forest-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1817,
          "y": 0.0294,
          "w": 0.7433,
          "h": 0.1739
        },
        {
          "x": 0.0867,
          "y": 0.2572,
          "w": 0.6983,
          "h": 0.1606
        },
        {
          "x": 0.19,
          "y": 0.4567,
          "w": 0.73,
          "h": 0.1689
        },
        {
          "x": 0.0867,
          "y": 0.6739,
          "w": 0.7683,
          "h": 0.18
        }
      ]
    }
  },
  {
    "id": "moon",
    "label": "moon",
    "category": "fall",
    "bg": "#4A3B2E",
    "slot": "rgba(255,255,255,0.26)",
    "sub": "rgba(240,226,206,0.72)",
    "fg": "#F0E2CE",
    "img": {
      "vertical": "/assets/themes/fall-moon-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.11,
          "y": 0.0494,
          "w": 0.785,
          "h": 0.1878
        },
        {
          "x": 0.115,
          "y": 0.275,
          "w": 0.7817,
          "h": 0.1867
        },
        {
          "x": 0.115,
          "y": 0.5,
          "w": 0.7817,
          "h": 0.1867
        },
        {
          "x": 0.1117,
          "y": 0.725,
          "w": 0.785,
          "h": 0.1867
        }
      ]
    }
  },
  {
    "id": "ember",
    "label": "ember",
    "category": "fall",
    "bg": "#1A0B08",
    "slot": "rgba(255,255,255,0.22)",
    "sub": "rgba(232,180,138,0.7)",
    "fg": "#E8B48A",
    "img": {
      "vertical": "/assets/themes/fall-ember-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1083,
          "y": 0.05,
          "w": 0.7867,
          "h": 0.1878
        },
        {
          "x": 0.1117,
          "y": 0.2739,
          "w": 0.7883,
          "h": 0.1883
        },
        {
          "x": 0.1117,
          "y": 0.4994,
          "w": 0.7883,
          "h": 0.1883
        },
        {
          "x": 0.115,
          "y": 0.7239,
          "w": 0.7833,
          "h": 0.1889
        }
      ]
    }
  },
  {
    "id": "spooky",
    "label": "spooky",
    "category": "fall",
    "bg": "#2A1408",
    "slot": "rgba(255,255,255,0.24)",
    "sub": "rgba(242,162,74,0.72)",
    "fg": "#F2A24A",
    "img": {
      "vertical": "/assets/themes/fall-spooky-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.11,
          "y": 0.05,
          "w": 0.7867,
          "h": 0.1878
        },
        {
          "x": 0.115,
          "y": 0.2739,
          "w": 0.785,
          "h": 0.1889
        },
        {
          "x": 0.1133,
          "y": 0.4989,
          "w": 0.7867,
          "h": 0.1889
        },
        {
          "x": 0.1133,
          "y": 0.7244,
          "w": 0.7867,
          "h": 0.1883
        }
      ]
    }
  },
  {
    "id": "fable",
    "label": "fable",
    "category": "winter",
    "bg": "#141A1C",
    "slot": "rgba(255,255,255,0.22)",
    "sub": "rgba(232,220,207,0.7)",
    "fg": "#E8DCCF",
    "img": {
      "vertical": "/assets/themes/winter-fable-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1083,
          "y": 0.0494,
          "w": 0.7883,
          "h": 0.1883
        },
        {
          "x": 0.1117,
          "y": 0.2744,
          "w": 0.7883,
          "h": 0.1878
        },
        {
          "x": 0.1117,
          "y": 0.4994,
          "w": 0.7883,
          "h": 0.1883
        },
        {
          "x": 0.1133,
          "y": 0.725,
          "w": 0.7867,
          "h": 0.1872
        }
      ]
    }
  },
  {
    "id": "starlit",
    "label": "starlit",
    "category": "winter",
    "bg": "#C3C7DA",
    "slot": "rgba(255,255,255,0.5)",
    "sub": "rgba(60,74,112,0.68)",
    "fg": "#3C4A70",
    "img": {
      "vertical": "/assets/themes/winter-starlit-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1117,
          "y": 0.05,
          "w": 0.7817,
          "h": 0.1872
        },
        {
          "x": 0.115,
          "y": 0.275,
          "w": 0.7833,
          "h": 0.1872
        },
        {
          "x": 0.115,
          "y": 0.4994,
          "w": 0.7833,
          "h": 0.1878
        },
        {
          "x": 0.115,
          "y": 0.7244,
          "w": 0.7817,
          "h": 0.1872
        }
      ]
    }
  },
  {
    "id": "village",
    "label": "village",
    "category": "winter",
    "bg": "#F0E4D6",
    "slot": "rgba(138,16,26,0.14)",
    "sub": "rgba(74,62,54,0.65)",
    "fg": "#8A101A",
    "img": {
      "vertical": "/assets/themes/winter-village-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.11,
          "y": 0.05,
          "w": 0.7833,
          "h": 0.1878
        },
        {
          "x": 0.115,
          "y": 0.275,
          "w": 0.7833,
          "h": 0.1872
        },
        {
          "x": 0.115,
          "y": 0.4994,
          "w": 0.7833,
          "h": 0.1878
        },
        {
          "x": 0.115,
          "y": 0.7244,
          "w": 0.7817,
          "h": 0.1878
        }
      ]
    }
  },
  {
    "id": "gingerbread",
    "label": "gingerbread",
    "category": "winter",
    "bg": "#4E100F",
    "slot": "rgba(255,255,255,0.24)",
    "sub": "rgba(243,220,196,0.72)",
    "fg": "#F3DCC4",
    "img": {
      "vertical": "/assets/themes/winter-gingerbread-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1117,
          "y": 0.0494,
          "w": 0.7817,
          "h": 0.1878
        },
        {
          "x": 0.115,
          "y": 0.2933,
          "w": 0.7767,
          "h": 0.1467
        },
        {
          "x": 0.115,
          "y": 0.5,
          "w": 0.7817,
          "h": 0.1867
        },
        {
          "x": 0.115,
          "y": 0.725,
          "w": 0.7833,
          "h": 0.1872
        }
      ]
    }
  },
  {
    "id": "fawn",
    "label": "fawn",
    "category": "winter",
    "bg": "#E4DED0",
    "slot": "rgba(122,86,58,0.14)",
    "sub": "rgba(90,74,62,0.65)",
    "fg": "#7A563A",
    "img": {
      "vertical": "/assets/themes/winter-fawn-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1133,
          "y": 0.05,
          "w": 0.78,
          "h": 0.1867
        },
        {
          "x": 0.115,
          "y": 0.275,
          "w": 0.7817,
          "h": 0.1867
        },
        {
          "x": 0.115,
          "y": 0.5006,
          "w": 0.7817,
          "h": 0.1861
        },
        {
          "x": 0.115,
          "y": 0.7256,
          "w": 0.78,
          "h": 0.1861
        }
      ]
    }
  },
  {
    "id": "typewriter",
    "label": "typewriter",
    "category": "cozy",
    "bg": "#EDD3C5",
    "slot": "rgba(90,70,64,0.14)",
    "sub": "rgba(90,70,64,0.62)",
    "fg": "#5A4640",
    "img": {
      "vertical": "/assets/themes/cozy-typewriter-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8817,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "tablecloth",
    "label": "tablecloth",
    "category": "cozy",
    "bg": "#ADBBCB",
    "slot": "rgba(255,255,255,0.5)",
    "sub": "rgba(62,76,96,0.66)",
    "fg": "#3E4C60",
    "img": {
      "vertical": "/assets/themes/cozy-tablecloth-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.8833,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "basket",
    "label": "basket",
    "category": "cozy",
    "bg": "#CD5769",
    "slot": "rgba(255,255,255,0.28)",
    "sub": "rgba(255,241,241,0.74)",
    "fg": "#FFF1F1",
    "img": {
      "vertical": "/assets/themes/cozy-basket-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.06,
          "y": 0.0206,
          "w": 0.8817,
          "h": 0.2056
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2061
        },
        {
          "x": 0.0567,
          "y": 0.4661,
          "w": 0.8833,
          "h": 0.2056
        },
        {
          "x": 0.0583,
          "y": 0.6889,
          "w": 0.8817,
          "h": 0.2056
        }
      ]
    }
  },
  {
    "id": "knit",
    "label": "knit",
    "category": "cozy",
    "bg": "#E6DDCB",
    "slot": "rgba(96,82,64,0.14)",
    "sub": "rgba(96,82,64,0.62)",
    "fg": "#605240",
    "img": {
      "vertical": "/assets/themes/cozy-knit-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.8833,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "macaron",
    "label": "macaron",
    "category": "cozy",
    "bg": "#E8DBC9",
    "slot": "rgba(72,92,116,0.16)",
    "sub": "rgba(72,92,116,0.64)",
    "fg": "#485C74",
    "img": {
      "vertical": "/assets/themes/cozy-macaron-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8817,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "cafe",
    "label": "cafe",
    "category": "cozy",
    "bg": "#E0D5CA",
    "slot": "rgba(90,70,66,0.14)",
    "sub": "rgba(90,70,66,0.62)",
    "fg": "#5A4642",
    "img": {
      "vertical": "/assets/themes/cozy-cafe-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.1883
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.8833,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "clothesline",
    "label": "clothesline",
    "category": "cozy",
    "bg": "#558955",
    "slot": "rgba(255,255,255,0.3)",
    "sub": "rgba(251,246,230,0.76)",
    "fg": "#FBF6E6",
    "img": {
      "vertical": "/assets/themes/cozy-clothesline-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.4656,
          "w": 0.885,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8817,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "quilt",
    "label": "quilt",
    "category": "cozy",
    "bg": "#948A95",
    "slot": "rgba(255,255,255,0.3)",
    "sub": "rgba(251,243,236,0.74)",
    "fg": "#FBF3EC",
    "img": {
      "vertical": "/assets/themes/cozy-quilt-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2061
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2061
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8817,
          "h": 0.2061
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8817,
          "h": 0.2061
        }
      ]
    }
  },
  {
    "id": "pinewood",
    "label": "pinewood",
    "category": "cozy",
    "bg": "#F9E7E2",
    "slot": "rgba(138,96,96,0.14)",
    "sub": "rgba(138,96,96,0.62)",
    "fg": "#8A6060",
    "img": {
      "vertical": "/assets/themes/cozy-pinewood-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.885,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "farmhouse",
    "label": "farmhouse",
    "category": "cozy",
    "bg": "#957050",
    "slot": "rgba(255,255,255,0.28)",
    "sub": "rgba(251,241,226,0.74)",
    "fg": "#FBF1E2",
    "img": {
      "vertical": "/assets/themes/cozy-farmhouse-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8833,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "strawberry",
    "label": "strawberry",
    "category": "cozy",
    "bg": "#D9E0B4",
    "slot": "rgba(74,86,50,0.16)",
    "sub": "rgba(74,86,50,0.64)",
    "fg": "#4A5632",
    "img": {
      "vertical": "/assets/themes/cozy-strawberry-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8917,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "seaside",
    "label": "seaside",
    "category": "cozy",
    "bg": "#FCEADB",
    "slot": "rgba(90,84,74,0.15)",
    "sub": "rgba(90,84,74,0.64)",
    "fg": "#5A544A",
    "img": {
      "vertical": "/assets/themes/cozy-seaside-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8817,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8817,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "clouds",
    "label": "clouds",
    "category": "cozy",
    "bg": "#FFF0C5",
    "slot": "rgba(86,98,120,0.15)",
    "sub": "rgba(86,98,120,0.64)",
    "fg": "#566278",
    "img": {
      "vertical": "/assets/themes/cozy-clouds-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.9017,
          "h": 0.2067
        },
        {
          "x": 0.0567,
          "y": 0.6883,
          "w": 0.8933,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "starry",
    "label": "starry",
    "category": "cozy",
    "bg": "#FEFBE5",
    "slot": "rgba(58,68,90,0.16)",
    "sub": "rgba(58,68,90,0.64)",
    "fg": "#3A445A",
    "img": {
      "vertical": "/assets/themes/cozy-starry-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.02,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.2428,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.4656,
          "w": 0.8833,
          "h": 0.2067
        },
        {
          "x": 0.0583,
          "y": 0.6883,
          "w": 0.8833,
          "h": 0.2067
        }
      ]
    }
  },
  {
    "id": "tower",
    "label": "tower",
    "category": "namsan",
    "bg": "#1C2546",
    "slot": "rgba(255,255,255,0.14)",
    "sub": "rgba(246,233,207,0.72)",
    "fg": "#F6E9CF",
    "img": {
      "vertical": "/assets/themes/namsan-tower-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.06,
          "y": 0.0239,
          "w": 0.8817,
          "h": 0.2033
        },
        {
          "x": 0.06,
          "y": 0.2506,
          "w": 0.8817,
          "h": 0.2033
        },
        {
          "x": 0.06,
          "y": 0.4778,
          "w": 0.8817,
          "h": 0.1972
        },
        {
          "x": 0.06,
          "y": 0.6989,
          "w": 0.8817,
          "h": 0.2044
        }
      ]
    }
  },
  {
    "id": "lovelocks",
    "label": "lovelocks",
    "category": "namsan",
    "bg": "#FBF4EA",
    "slot": "rgba(110,86,72,0.15)",
    "sub": "rgba(110,86,72,0.64)",
    "fg": "#6E5648",
    "img": {
      "vertical": "/assets/themes/namsan-locks-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1083,
          "y": 0.04,
          "w": 0.7817,
          "h": 0.1872
        },
        {
          "x": 0.1083,
          "y": 0.2644,
          "w": 0.7867,
          "h": 0.1872
        },
        {
          "x": 0.11,
          "y": 0.4906,
          "w": 0.785,
          "h": 0.1822
        },
        {
          "x": 0.1083,
          "y": 0.7056,
          "w": 0.7867,
          "h": 0.1756
        }
      ]
    }
  },
  {
    "id": "citylights",
    "label": "citylights",
    "category": "namsan",
    "bg": "#C9B5E8",
    "slot": "rgba(45,50,98,0.16)",
    "sub": "rgba(45,50,98,0.64)",
    "fg": "#2D3262",
    "img": {
      "vertical": "/assets/themes/namsan-skyline-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.0583,
          "y": 0.0228,
          "w": 0.8833,
          "h": 0.2044
        },
        {
          "x": 0.0583,
          "y": 0.25,
          "w": 0.885,
          "h": 0.2044
        },
        {
          "x": 0.0583,
          "y": 0.4767,
          "w": 0.885,
          "h": 0.2017
        },
        {
          "x": 0.0567,
          "y": 0.7,
          "w": 0.8867,
          "h": 0.1956
        }
      ]
    }
  },
  {
    "id": "dinner",
    "label": "dinner",
    "category": "namsan",
    "bg": "#FFFDF8",
    "slot": "rgba(92,70,78,0.14)",
    "sub": "rgba(92,70,78,0.64)",
    "fg": "#5C464E",
    "img": {
      "vertical": "/assets/themes/namsan-postcard-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1433,
          "y": 0.0483,
          "w": 0.7133,
          "h": 0.1844
        },
        {
          "x": 0.1433,
          "y": 0.27,
          "w": 0.7133,
          "h": 0.1844
        },
        {
          "x": 0.1433,
          "y": 0.4944,
          "w": 0.7133,
          "h": 0.1806
        },
        {
          "x": 0.1433,
          "y": 0.71,
          "w": 0.7133,
          "h": 0.185
        }
      ]
    }
  },
  {
    "id": "cake",
    "label": "cake",
    "category": "birthday",
    "bg": "#FBE3EA",
    "slot": "rgba(217,102,142,0.14)",
    "sub": "rgba(160,90,115,0.65)",
    "fg": "#D9668E",
    "img": {
      "vertical": "/assets/themes/birthday-cake-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.16,
          "y": 0.015,
          "w": 0.74,
          "h": 0.1761
        },
        {
          "x": 0.16,
          "y": 0.2233,
          "w": 0.74,
          "h": 0.1767
        },
        {
          "x": 0.16,
          "y": 0.4322,
          "w": 0.74,
          "h": 0.1761
        },
        {
          "x": 0.16,
          "y": 0.6406,
          "w": 0.7383,
          "h": 0.1767
        }
      ]
    }
  },
  {
    "id": "balloons",
    "label": "balloons",
    "category": "birthday",
    "bg": "#BFE0F6",
    "slot": "rgba(255,255,255,0.4)",
    "sub": "rgba(255,255,255,0.8)",
    "fg": "#FFFFFF",
    "img": {
      "vertical": "/assets/themes/birthday-balloons-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.165,
          "y": 0.0694,
          "w": 0.6933,
          "h": 0.1844
        },
        {
          "x": 0.1433,
          "y": 0.2961,
          "w": 0.715,
          "h": 0.1844
        },
        {
          "x": 0.1433,
          "y": 0.5178,
          "w": 0.715,
          "h": 0.1833
        },
        {
          "x": 0.1433,
          "y": 0.7383,
          "w": 0.715,
          "h": 0.1833
        }
      ]
    }
  },
  {
    "id": "confetti",
    "label": "confetti",
    "category": "birthday",
    "bg": "#FFF6EA",
    "slot": "rgba(226,127,166,0.14)",
    "sub": "rgba(150,110,120,0.65)",
    "fg": "#E27FA6",
    "img": {
      "vertical": "/assets/themes/birthday-confetti-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.12,
          "y": 0.0483,
          "w": 0.7617,
          "h": 0.195
        },
        {
          "x": 0.12,
          "y": 0.2811,
          "w": 0.76,
          "h": 0.1911
        },
        {
          "x": 0.12,
          "y": 0.5094,
          "w": 0.76,
          "h": 0.1911
        },
        {
          "x": 0.12,
          "y": 0.7389,
          "w": 0.76,
          "h": 0.1906
        }
      ]
    }
  },
  {
    "id": "hbd",
    "label": "hbd",
    "category": "birthday",
    "bg": "#DCCBEB",
    "slot": "rgba(255,255,255,0.35)",
    "sub": "rgba(110,100,130,0.7)",
    "fg": "#8E8FA3",
    "img": {
      "vertical": "/assets/themes/birthday-hbd-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.1183,
          "y": 0.0228,
          "w": 0.76,
          "h": 0.1817
        },
        {
          "x": 0.1233,
          "y": 0.2394,
          "w": 0.7583,
          "h": 0.1806
        },
        {
          "x": 0.1267,
          "y": 0.455,
          "w": 0.7567,
          "h": 0.1806
        },
        {
          "x": 0.13,
          "y": 0.6694,
          "w": 0.755,
          "h": 0.1806
        }
      ]
    }
  },
  {
    "id": "present",
    "label": "present",
    "category": "birthday",
    "bg": "#FDE6EE",
    "slot": "rgba(224,127,160,0.14)",
    "sub": "rgba(160,100,120,0.65)",
    "fg": "#E07FA0",
    "img": {
      "vertical": "/assets/themes/birthday-present-v.webp"
    },
    "frame": true,
    "holes": {
      "vertical": [
        {
          "x": 0.2267,
          "y": 0.086,
          "w": 0.6367,
          "h": 0.1862
        },
        {
          "x": 0.2267,
          "y": 0.3006,
          "w": 0.6367,
          "h": 0.185
        },
        {
          "x": 0.2267,
          "y": 0.5144,
          "w": 0.6367,
          "h": 0.1844
        },
        {
          "x": 0.1433,
          "y": 0.7278,
          "w": 0.72,
          "h": 0.185
        }
      ]
    }
  },
  {
    "id": "table",
    "label": "table",
    "category": "justus",
    "bg": "#F4E6EA",
    "slot": "rgba(160,90,110,0.14)",
    "sub": "rgba(90,70,74,0.65)",
    "fg": "#8A4A5E",
    "img": {
      "duo": "/assets/themes/duo-table-d.webp"
    },
    "frame": true,
    "holes": {
      "duo": [
        {
          "x": 0.1375,
          "y": 0.1056,
          "w": 0.7533,
          "h": 0.3272
        },
        {
          "x": 0.1358,
          "y": 0.5361,
          "w": 0.7392,
          "h": 0.3178
        }
      ]
    }
  },
  {
    "id": "polka",
    "label": "polka",
    "category": "justus",
    "bg": "#141414",
    "slot": "rgba(255,255,255,0.22)",
    "sub": "rgba(242,237,228,0.7)",
    "fg": "#F2EDE4",
    "img": {
      "duo": "/assets/themes/duo-polka-d.webp"
    },
    "frame": true,
    "holes": {
      "duo": [
        {
          "x": 0.14,
          "y": 0.1,
          "w": 0.6617,
          "h": 0.2761
        },
        {
          "x": 0.1533,
          "y": 0.5583,
          "w": 0.6425,
          "h": 0.2744
        }
      ]
    }
  },
  {
    "id": "chrome",
    "label": "chrome",
    "category": "justus",
    "bg": "#FFFFFF",
    "slot": "rgba(60,60,66,0.12)",
    "sub": "rgba(42,42,48,0.6)",
    "fg": "#2A2A30",
    "img": {
      "duo": "/assets/themes/duo-chrome-d.webp"
    },
    "frame": true,
    "holes": {
      "duo": [
        {
          "x": 0.1808,
          "y": 0.165,
          "w": 0.58,
          "h": 0.3039
        },
        {
          "x": 0.1633,
          "y": 0.5056,
          "w": 0.5933,
          "h": 0.3067
        }
      ]
    }
  },
  {
    "id": "stamp",
    "label": "stamp",
    "category": "justus",
    "bg": "#3A100E",
    "slot": "rgba(255,255,255,0.24)",
    "sub": "rgba(232,207,168,0.72)",
    "fg": "#E8CFA8",
    "img": {
      "duo": "/assets/themes/duo-stamp-d.webp"
    },
    "frame": true,
    "holes": {
      "duo": [
        {
          "x": 0.2425,
          "y": 0.1956,
          "w": 0.5392,
          "h": 0.27
        },
        {
          "x": 0.2367,
          "y": 0.4972,
          "w": 0.5392,
          "h": 0.2694
        }
      ]
    }
  },
  {
    "id": "doily",
    "label": "doily",
    "category": "justus",
    "bg": "#3A0E12",
    "slot": "rgba(255,255,255,0.26)",
    "sub": "rgba(239,231,207,0.72)",
    "fg": "#EFE7CF",
    "img": {
      "duo": "/assets/themes/duo-doily-d.webp"
    },
    "frame": true,
    "holes": {
      "duo": [
        {
          "x": 0.2575,
          "y": 0.2317,
          "w": 0.495,
          "h": 0.2367
        },
        {
          "x": 0.2567,
          "y": 0.5172,
          "w": 0.4958,
          "h": 0.2372
        }
      ]
    }
  }
];

export type PhotoboothLayoutId = 'vertical' | 'grid' | 'duo' | 'polaroid';

export function isFrameTheme(themeId: string): boolean {
  const t = ALL_THEMES.find((th) => th.id === themeId);
  return !!t?.frame;
}

export function themeHoles(themeId: string, layout: PhotoboothLayoutId = 'vertical'): FrameHole[] | null {
  const t = ALL_THEMES.find((th) => th.id === themeId);
  if (!t || !t.frame) return null;
  return t.holes?.[layout] || null;
}

export function themeWindowShape(themeId: string): 'rect' | 'circle' {
  const t = ALL_THEMES.find((th) => th.id === themeId);
  return t?.shape === 'circle' ? 'circle' : 'rect';
}

export function themeArt(themeId: string, layout: PhotoboothLayoutId = 'vertical'): string | null {
  const t = ALL_THEMES.find((th) => th.id === themeId);
  if (!t?.img) return null;
  return t.img[layout] || t.img.vertical || t.img.grid || null;
}

export function getThemesForCategory(category: string, layout: PhotoboothLayoutId): FrameTheme[] {
  return ALL_THEMES.filter((t) => {
    if (t.category !== category) return false;
    if (!t.img || Object.keys(t.img).length === 0) return true;
    return !!t.img[layout];
  });
}

export function getCategoriesForLayout(layout: PhotoboothLayoutId) {
  return THEME_CATEGORIES.map((cat) => {
    const themes = getThemesForCategory(cat.id, layout);
    return {
      ...cat,
      count: themes.length,
    };
  }).filter((cat) => cat.count > 0);
}
