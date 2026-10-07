import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface GiphyImageSpec {
  url?: string;
  webp?: string;
  width?: string;
  height?: string;
}

interface GiphyItem {
  id: string;
  title: string;
  images?: {
    fixed_height?: GiphyImageSpec;
    fixed_height_small?: GiphyImageSpec;
    original?: GiphyImageSpec;
  };
}

export interface StickerData {
  id: string;
  title: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GIPHY_API_KEY;

    if (!apiKey) {
      console.warn('[GIPHY API] Warning: GIPHY_API_KEY is not defined in environment variables.');
      return NextResponse.json(
        {
          success: false,
          error: 'GIPHY_API_KEY is not configured on the server.',
          stickers: [],
          data: [],
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';

    let endpoint: string;
    if (!query) {
      // Trending mode: If query is empty, call GIPHY trending stickers
      endpoint = `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=25&rating=g`;
    } else {
      // Search mode: If parameter q is present, call GIPHY search stickers
      endpoint = `https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=25&rating=g`;
    }

    const res = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[GIPHY API] Error from GIPHY (${res.status}):`, errText);
      return NextResponse.json(
        {
          success: false,
          error: `GIPHY API responded with status ${res.status}`,
          stickers: [],
          data: [],
        },
        { status: res.status }
      );
    }

    const json = await res.json();
    const rawItems: GiphyItem[] = json.data || [];

    const stickers: StickerData[] = rawItems.map((item) => {
      const fixedHeight = item.images?.fixed_height;
      const original = item.images?.original;

      // Prefer transparent WebP format, fallback to transparent GIF
      const transparentUrl =
        original?.webp ||
        original?.url ||
        fixedHeight?.webp ||
        fixedHeight?.url ||
        '';

      const previewUrl =
        fixedHeight?.webp ||
        fixedHeight?.url ||
        original?.webp ||
        original?.url ||
        '';

      const width = parseInt(fixedHeight?.width || original?.width || '200', 10);
      const height = parseInt(fixedHeight?.height || original?.height || '200', 10);

      return {
        id: item.id,
        title: item.title || 'Sticker',
        url: transparentUrl,
        previewUrl,
        width,
        height,
      };
    }).filter((s) => Boolean(s.url));

    return NextResponse.json({
      success: true,
      mode: query ? 'search' : 'trending',
      query,
      count: stickers.length,
      stickers,
      data: stickers,
    });
  } catch (error) {
    console.error('[GIPHY API] Unexpected route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error',
        stickers: [],
        data: [],
      },
      { status: 500 }
    );
  }
}
