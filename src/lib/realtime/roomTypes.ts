export type RoomRole = 'host' | 'guest';
export type PlayerColor = 'pink' | 'blue';

export interface Participant {
  id: string;
  name: string;
  role: RoomRole;
  color: PlayerColor;
  cameraReady: boolean;
  isReady: boolean;
  joinedAt: number;
}

export type PhotoboothScene =
  | 'LOBBY'
  | 'LAYOUT'
  | 'THEME'
  | 'BOOTH'
  | 'EDIT'
  | 'FILTER'
  | 'DECORATE'
  | 'DOWNLOAD';

export type RTCSignal =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit; senderId: string }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit; senderId: string }
  | { type: 'candidate'; candidate: RTCIceCandidateInit; senderId: string }
  | { type: 'request_offer'; senderId: string }
  | { type: 'camera_state'; video: boolean; audio: boolean; senderId: string };

export type RoomSyncAction =
  | { type: 'SCENE_CHANGE'; scene: PhotoboothScene }
  | { type: 'LAYOUT_SELECT'; layout: string }
  | { type: 'THEME_SELECT'; frameId: string }
  | { type: 'FILTER_SELECT'; filter: string }
  | { type: 'COUNTDOWN_START'; runId: string; duration: number; shotIndex: number }
  | { type: 'SHUTTER_FIRE'; runId: string; shotIndex: number }
  | { type: 'PHOTO_FRAME'; shotIndex: number; senderId: string; dataUrl: string }
  | { type: 'SELECT_INDICES'; indices: number[] }
  | { type: 'STRIP_UPDATE'; strip: (number | null)[] }
  | { type: 'RETAKE_SHOT'; shotIndex: number }
  | { type: 'LIVE_PREVIEW'; senderId: string; dataUrl: string }
  | { type: 'READY_TOGGLE'; isReady: boolean; senderId: string }
  | { type: 'BG_CHANGE'; bg: string }
  | { type: 'BOOTH_READY'; senderId: string }
  | { type: 'DECO_ADD_STICKER'; cid: string; id: number; x: number; y: number; scale: number; rot: number }
  | { type: 'DECO_MOVE_STICKER'; cid: string; x: number; y: number; scale: number; rot: number }
  | { type: 'DECO_REMOVE_STICKER'; cid: string }
  | { type: 'DECO_ADD_STROKE'; stroke: { cid: string; mode: 'draw' | 'erase'; color: string; size: number; pts: number[] } }
  | { type: 'DECO_CLEAR_STROKES' }
  | { type: 'DECO_ADD_TEXT'; cid: string; text: string; color: string; font: string; x: number; y: number; scale: number; rot: number }
  | { type: 'DECO_REMOVE_TEXT'; cid: string };

export interface CursorPosition {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  senderId: string;
}

export interface ReactionItem {
  id: string;
  emoji: string;
  senderId: string;
  senderName: string;
  color: PlayerColor;
  x: number; // percentage 10-90
}

