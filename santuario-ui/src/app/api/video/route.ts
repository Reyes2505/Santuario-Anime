import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let requestedPath = searchParams.get('path') || '';

  if (!requestedPath) {
    return new NextResponse('Path parameter required', { status: 400 });
  }

  // Sanitizar path para evitar Directory Traversal
  requestedPath = requestedPath.replace(/^(\.\.[\/\\])+/, '').replace(/^\//, '');

  const uiPublicDir = path.join(process.cwd(), 'public');
  const projectPublicDir = '/home/aaron/Documentos/santuario-anime002/public';

  const candidatePaths: string[] = [
    path.join(uiPublicDir, 'videos', requestedPath),
    path.join(uiPublicDir, requestedPath),
    path.join(projectPublicDir, 'videos', requestedPath),
  ];

  if (!requestedPath.includes('/')) {
    candidatePaths.unshift(
      path.join(uiPublicDir, 'videos', 'mushoku', requestedPath),
      path.join(projectPublicDir, 'videos', 'mushoku', requestedPath)
    );
  }

  let filePath = '';
  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        filePath = candidate;
        break;
      }
    } catch {
      // Ignorar errores de ruta inaccesible
    }
  }

  if (!filePath) {
    return new NextResponse(
      `Video no encontrado localmente. Coloca el archivo en public/videos/${requestedPath}`,
      { status: 404 }
    );
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = request.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      return new NextResponse('Requested range not satisfiable', {
        status: 416,
        headers: { 'Content-Range': `bytes */${fileSize}` },
      });
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(webStream as any, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize.toString(),
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache',
      },
    });
  }

  const fileStream = fs.createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => controller.enqueue(chunk));
      fileStream.on('end', () => controller.close());
      fileStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      fileStream.destroy();
    },
  });

  return new NextResponse(webStream as any, {
    status: 200,
    headers: {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    },
  });
}
