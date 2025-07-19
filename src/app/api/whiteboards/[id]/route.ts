import { NextRequest, NextResponse } from 'next/server';
import { WhiteboardModel, ElementModel } from '@/lib/database/models';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const whiteboardId = params.id;

    // Get whiteboard details
    const whiteboard = await WhiteboardModel.findById(whiteboardId);
    if (!whiteboard) {
      return NextResponse.json(
        { error: 'Whiteboard not found' },
        { status: 404 }
      );
    }

    // Get all elements for this whiteboard
    const elements = await ElementModel.findByWhiteboardId(whiteboardId);

    return NextResponse.json({
      whiteboard,
      elements,
    });
  } catch (error) {
    console.error('Error fetching whiteboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch whiteboard' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const whiteboardId = params.id;
    const body = await request.json();

    // Update whiteboard settings
    const updatedVersion = await WhiteboardModel.updateVersion(whiteboardId);

    return NextResponse.json({ version: updatedVersion });
  } catch (error) {
    console.error('Error updating whiteboard:', error);
    return NextResponse.json(
      { error: 'Failed to update whiteboard' },
      { status: 500 }
    );
  }
}