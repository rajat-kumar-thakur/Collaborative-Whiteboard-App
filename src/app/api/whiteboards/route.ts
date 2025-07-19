import { NextRequest, NextResponse } from 'next/server';
import { WhiteboardModel } from '@/lib/database/models';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isPublic = false } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Whiteboard name is required' },
        { status: 400 }
      );
    }

    const whiteboard = await WhiteboardModel.create({
      name,
      ownerId: 'anonymous-user', // TODO: Get from auth
      collaborators: [],
      isPublic,
      settings: {
        theme: 'light',
        gridVisible: true,
        snapToGrid: false,
      },
    });

    return NextResponse.json(whiteboard);
  } catch (error) {
    console.error('Error creating whiteboard:', error);
    return NextResponse.json(
      { error: 'Failed to create whiteboard' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous-user';

    const whiteboards = await WhiteboardModel.findByUserId(userId);
    return NextResponse.json(whiteboards);
  } catch (error) {
    console.error('Error fetching whiteboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch whiteboards' },
      { status: 500 }
    );
  }
}