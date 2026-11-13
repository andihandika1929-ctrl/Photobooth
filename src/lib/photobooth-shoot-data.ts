export interface BackgroundItem {
  id: string;
  label: string;
  thumb: string;
  src: string;
  group?: 'scenes' | 'travel';
}

export interface FaceFilterPart {
  img: string;
  anchor: 'head' | 'eyes' | 'nose' | 'mouth' | 'chin';
  w: number;
  dx?: number;
  dy?: number;
  rot?: number;
}

export interface FaceFilterItem {
  id: string;
  label: string;
  previewImg: string | null;
  parts: FaceFilterPart[];
}

export const BACKGROUND_SCENES: BackgroundItem[] = [
  { id: 'none', label: 'None', thumb: '', src: '', group: 'scenes' },
  { id: 'paris', label: 'Paris', thumb: '/assets/backgrounds/paris-thumb.webp', src: '/assets/backgrounds/paris.webp', group: 'scenes' },
  { id: 'seoul', label: 'Seoul', thumb: '/assets/backgrounds/seoul-thumb.webp', src: '/assets/backgrounds/seoul.webp', group: 'scenes' },
  { id: 'namsan', label: 'Namsan Night', thumb: '/assets/backgrounds/namsan-thumb.webp', src: '/assets/backgrounds/namsan.webp', group: 'scenes' },
  { id: 'sunset', label: 'Sunset', thumb: '/assets/backgrounds/sunset-thumb.webp', src: '/assets/backgrounds/sunset.webp', group: 'scenes' },
  { id: 'picnic', label: 'Picnic', thumb: '/assets/backgrounds/picnic-thumb.webp', src: '/assets/backgrounds/picnic.webp', group: 'scenes' },
  { id: 'cinema', label: 'Cinema', thumb: '/assets/backgrounds/cinema-thumb.webp', src: '/assets/backgrounds/cinema.webp', group: 'scenes' },
  { id: 'pinkroom', label: 'Pink Room', thumb: '/assets/backgrounds/pinkroom-thumb.webp', src: '/assets/backgrounds/pinkroom.webp', group: 'scenes' },
  { id: 'window', label: 'Lace Window', thumb: '/assets/backgrounds/window-thumb.webp', src: '/assets/backgrounds/window.webp', group: 'scenes' },
  { id: 'stage', label: 'Stage', thumb: '/assets/backgrounds/stage-thumb.webp', src: '/assets/backgrounds/stage.webp', group: 'scenes' },
  { id: 'cherry', label: 'Cherry', thumb: '/assets/backgrounds/cherry-thumb.webp', src: '/assets/backgrounds/cherry.webp', group: 'scenes' },
  { id: 'pixel', label: 'Pixel World', thumb: '/assets/backgrounds/pixel-thumb.webp', src: '/assets/backgrounds/pixel.webp', group: 'scenes' },
  { id: 'thisisfine', label: 'This Is Fine', thumb: '/assets/backgrounds/thisisfine-thumb.webp', src: '/assets/backgrounds/thisisfine.webp', group: 'scenes' },
  { id: 'party', label: 'Party', thumb: '/assets/backgrounds/party-thumb.webp', src: '/assets/backgrounds/party.webp', group: 'scenes' },
  { id: 'bdaynight', label: 'Birthday Night', thumb: '/assets/backgrounds/bdaynight-thumb.webp', src: '/assets/backgrounds/bdaynight.webp', group: 'scenes' },
  { id: 'beach', label: 'Beach', thumb: '/assets/backgrounds/beach-thumb.webp', src: '/assets/backgrounds/beach.webp', group: 'scenes' },
  { id: 'blossom', label: 'Blossom', thumb: '/assets/backgrounds/blossom-thumb.webp', src: '/assets/backgrounds/blossom.webp', group: 'scenes' },
  { id: 'cafe', label: 'Cafe', thumb: '/assets/backgrounds/cafe-thumb.webp', src: '/assets/backgrounds/cafe.webp', group: 'scenes' },
  { id: 'bedroom', label: 'Cozy', thumb: '/assets/backgrounds/bedroom-thumb.webp', src: '/assets/backgrounds/bedroom.webp', group: 'scenes' },
  { id: 'rooftop', label: 'Rooftop', thumb: '/assets/backgrounds/rooftop-thumb.webp', src: '/assets/backgrounds/rooftop.webp', group: 'scenes' },
  { id: 'clouds', label: 'Clouds', thumb: '/assets/backgrounds/clouds-thumb.webp', src: '/assets/backgrounds/clouds.webp', group: 'scenes' },
  { id: 'arcade', label: 'Arcade', thumb: '/assets/backgrounds/arcade-thumb.webp', src: '/assets/backgrounds/arcade.webp', group: 'scenes' },
  { id: 'cell', label: 'Prison', thumb: '/assets/backgrounds/cell-thumb.webp', src: '/assets/backgrounds/cell.webp', group: 'scenes' },
];

export const BACKGROUND_TRAVEL: BackgroundItem[] = [
  { id: 'newyork', label: 'New York', thumb: '/assets/backgrounds/newyork-thumb.webp', src: '/assets/backgrounds/newyork.webp', group: 'travel' },
  { id: 'tokyo', label: 'Tokyo', thumb: '/assets/backgrounds/tokyo-thumb.webp', src: '/assets/backgrounds/tokyo.webp', group: 'travel' },
  { id: 'vancouver', label: 'Vancouver', thumb: '/assets/backgrounds/vancouver-thumb.webp', src: '/assets/backgrounds/vancouver.webp', group: 'travel' },
  { id: 'hawaii', label: 'Hawaii', thumb: '/assets/backgrounds/hawaii-thumb.webp', src: '/assets/backgrounds/hawaii.webp', group: 'travel' },
  { id: 'seattle', label: 'Seattle', thumb: '/assets/backgrounds/seattle-thumb.webp', src: '/assets/backgrounds/seattle.webp', group: 'travel' },
  { id: 'santorini', label: 'Santorini', thumb: '/assets/backgrounds/santorini-thumb.webp', src: '/assets/backgrounds/santorini.webp', group: 'travel' },
  { id: 'palace', label: 'Seoul Palace', thumb: '/assets/backgrounds/palace-thumb.webp', src: '/assets/backgrounds/palace.webp', group: 'travel' },
  { id: 'sanmiguel', label: 'Mexico', thumb: '/assets/backgrounds/sanmiguel-thumb.webp', src: '/assets/backgrounds/sanmiguel.webp', group: 'travel' },
];

export const ALL_BACKGROUNDS: BackgroundItem[] = [...BACKGROUND_SCENES, ...BACKGROUND_TRAVEL];

export const FACE_FILTERS: FaceFilterItem[] = [
  { id: 'none', label: 'None', previewImg: null, parts: [] },
  {
    id: 'puppy',
    label: 'Puppy',
    previewImg: '/assets/filters/puppy-ears.webp',
    parts: [
      { img: 'puppy-ears', anchor: 'head', w: 1.6, dy: -0.36 },
      { img: 'puppy-nose', anchor: 'nose', w: 0.72, dy: 0.1 },
    ],
  },
  {
    id: 'kitty',
    label: 'Kitty',
    previewImg: '/assets/filters/kitty-ears.webp',
    parts: [
      { img: 'kitty-ears', anchor: 'head', w: 1.5, dy: -0.4 },
      { img: 'kitty-nose', anchor: 'nose', w: 1.05, dy: 0.05 },
    ],
  },
  {
    id: 'bunny',
    label: 'Bunny',
    previewImg: '/assets/filters/bunny-ears.webp',
    parts: [
      { img: 'bunny-ears', anchor: 'head', w: 1.1, dy: -0.78 },
      { img: 'bunny-nose', anchor: 'nose', w: 0.5, dy: 0.06 },
    ],
  },
  {
    id: 'bear',
    label: 'Teddy',
    previewImg: '/assets/filters/bear-ears.webp',
    parts: [
      { img: 'bear-ears', anchor: 'head', w: 1.55, dy: -0.32 },
      { img: 'bear-nose', anchor: 'nose', w: 0.52, dy: 0.08 },
    ],
  },
  {
    id: 'mouse',
    label: 'Mouse',
    previewImg: '/assets/filters/mouse-ears.webp',
    parts: [{ img: 'mouse-ears', anchor: 'head', w: 1.7, dy: -0.42 }],
  },
  {
    id: 'flowers',
    label: 'Flowers',
    previewImg: '/assets/filters/flower-crown.webp',
    parts: [{ img: 'flower-crown', anchor: 'head', w: 1.45, dy: -0.26 }],
  },
  {
    id: 'halo',
    label: 'Angel',
    previewImg: '/assets/filters/halo.webp',
    parts: [{ img: 'halo', anchor: 'head', w: 1.0, dy: -0.62 }],
  },
  {
    id: 'devil',
    label: 'Devil',
    previewImg: '/assets/filters/devil-horns.webp',
    parts: [{ img: 'devil-horns', anchor: 'head', w: 1.25, dy: -0.4 }],
  },
  {
    id: 'fairy',
    label: 'Fairy',
    previewImg: '/assets/filters/star-crown.webp',
    parts: [
      { img: 'star-crown', anchor: 'head', w: 1.45, dy: -0.42 },
      { img: 'sparkle', anchor: 'eyes', w: 0.45, dx: -0.8, dy: 0.1 },
      { img: 'sparkle', anchor: 'eyes', w: 0.38, dx: 0.82, dy: -0.05, rot: 20 },
    ],
  },
  {
    id: 'hearts',
    label: 'In Love',
    previewImg: '/assets/filters/hearts.webp',
    parts: [
      { img: 'hearts', anchor: 'head', w: 0.6, dx: -0.72, dy: -0.42, rot: -12 },
      { img: 'hearts', anchor: 'head', w: 0.5, dx: 0.74, dy: -0.5, rot: 14 },
    ],
  },
  {
    id: 'crown',
    label: 'Royal',
    previewImg: '/assets/filters/crown.webp',
    parts: [{ img: 'crown', anchor: 'head', w: 1.1, dy: -0.52 }],
  },
  {
    id: 'tiara',
    label: 'Princess',
    previewImg: '/assets/filters/tiara.webp',
    parts: [{ img: 'tiara', anchor: 'head', w: 1.0, dy: -0.48 }],
  },
  {
    id: 'cowboy',
    label: 'Cowboy',
    previewImg: '/assets/filters/cowboy-hat.webp',
    parts: [{ img: 'cowboy-hat', anchor: 'head', w: 1.75, dy: -0.5 }],
  },
  {
    id: 'party',
    label: 'Party',
    previewImg: '/assets/filters/party-hat.webp',
    parts: [{ img: 'party-hat', anchor: 'head', w: 0.72, dx: 0.18, dy: -0.68, rot: 12 }],
  },
  {
    id: 'santa',
    label: 'Santa',
    previewImg: '/assets/filters/santa-hat.webp',
    parts: [{ img: 'santa-hat', anchor: 'head', w: 1.5, dy: -0.55 }],
  },
  {
    id: 'wizard',
    label: 'Wizard',
    previewImg: '/assets/filters/wizard-hat.webp',
    parts: [{ img: 'wizard-hat', anchor: 'head', w: 1.55, dy: -0.72 }],
  },
  {
    id: 'beret',
    label: 'Paris',
    previewImg: '/assets/filters/beret.webp',
    parts: [{ img: 'beret', anchor: 'head', w: 1.35, dx: -0.1, dy: -0.45 }],
  },
  {
    id: 'tophat',
    label: 'Fancy',
    previewImg: '/assets/filters/top-hat.webp',
    parts: [{ img: 'top-hat', anchor: 'head', w: 1.3, dy: -0.72 }],
  },
  {
    id: 'heartEyes',
    label: 'Heart Shades',
    previewImg: '/assets/filters/heart-glasses.webp',
    parts: [{ img: 'heart-glasses', anchor: 'eyes', w: 1.3, dy: 0.02 }],
  },
  {
    id: 'shades',
    label: 'Cool',
    previewImg: '/assets/filters/sunglasses.webp',
    parts: [{ img: 'sunglasses', anchor: 'eyes', w: 1.25, dy: 0.02 }],
  },
  {
    id: 'mustache',
    label: 'Moustache',
    previewImg: '/assets/filters/mustache.webp',
    parts: [{ img: 'mustache', anchor: 'nose', w: 0.78, dy: 0.2 }],
  },
];

export const SHOT_POSES: string[] = [
  'half a heart each. They join in the middle',
  'peace sign by your cheek',
  'squish your own cheeks',
  'lean in towards the middle',
  'wave with your outside hand',
  'both hands under your chin',
  'hands on your face, act shocked',
  'head back, biggest fake laugh',
];

export const FACE_FILTERS_MAP: Record<string, FaceFilterItem> = Object.fromEntries(
  FACE_FILTERS.map((f) => [f.id, f])
);

export function getPoseForShot(shotIndex: number): string {
  return SHOT_POSES[shotIndex % SHOT_POSES.length];
}

