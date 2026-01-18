# Progressive Image Generation with Server-Sent Events (SSE)

## Overview

The system now supports **progressive image display** where images appear as they're generated, instead of waiting for all images to complete.

## How It Works

1. **Frontend** connects to `/api/generate-stream/:sessionId` using EventSource
2. **Backend** generates images one at a time (sequential - avoids rate limits)
3. Each completed image is **immediately sent** to the frontend
4. **Frontend** displays images in real-time as they arrive

## API Endpoint

```
GET /api/generate-stream/:sessionId?customPrompts={json}&selectedPerspectives={json}
```

### Query Parameters:
- `customPrompts` (optional): JSON string of custom prompts
- `selectedPerspectives` (optional): JSON array of perspective IDs to generate

### Event Types:

1. **start**: Generation has started
2. **progress**: Progress updates (master prompts phase, image generation phase)
3. **image-start**: Starting to generate a specific image
4. **image-complete**: An image has been generated (includes base64 data)
5. **image-error**: An image failed to generate
6. **complete**: All images generated
7. **error**: Fatal error occurred

## Frontend Example (JavaScript)

```javascript
// Start streaming generation
function startStreamingGeneration(sessionId) {
  const eventSource = new EventSource(`/api/generate-stream/${sessionId}`);

  eventSource.addEventListener('start', (e) => {
    const data = JSON.parse(e.data);
    console.log('Generation started:', data.message);
  });

  eventSource.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data);
    console.log(`Progress: ${data.message}`);
    // Update progress bar: data.phase, data.total
  });

  eventSource.addEventListener('image-start', (e) => {
    const data = JSON.parse(e.data);
    console.log(`Starting image ${data.imageNumber}/${data.total}: ${data.perspectiveId}`);
    // Show loading indicator for this image slot
  });

  eventSource.addEventListener('image-complete', (e) => {
    const data = JSON.parse(e.data);

    // Display the image immediately!
    if (data.success && data.imageBase64) {
      const imgElement = document.createElement('img');
      imgElement.src = `data:image/jpeg;base64,${data.imageBase64}`;
      imgElement.alt = data.perspectiveName;

      // Add to gallery
      document.getElementById('image-gallery').appendChild(imgElement);

      console.log(`✓ Image ${data.imageNumber} complete (${data.progress}%)`);
    } else {
      console.error(`✗ Image ${data.imageNumber} failed:`, data.error);
    }
  });

  eventSource.addEventListener('image-error', (e) => {
    const data = JSON.parse(e.data);
    console.error(`Image ${data.imageNumber} error:`, data.error);
    // Show error for this image slot
  });

  eventSource.addEventListener('complete', (e) => {
    const data = JSON.parse(e.data);
    console.log(`All done! ${data.successCount}/${data.totalImages} images generated`);
    eventSource.close();
    // Show completion message
  });

  eventSource.addEventListener('error', (e) => {
    const data = JSON.parse(e.data);
    console.error('Generation error:', data.message);
    eventSource.close();
  });

  // Handle connection errors
  eventSource.onerror = (err) => {
    console.error('EventSource error:', err);
    eventSource.close();
  };
}
```

## Benefits

1. **Better UX**: Users see progress in real-time
2. **Faster perceived performance**: First images appear quickly
3. **No polling**: Server pushes updates automatically
4. **Rate limit friendly**: Still generates one image at a time
5. **Error visibility**: See which specific images fail immediately

## Rate Limiting

**Important**: Progressive streaming does NOT reduce 429 errors because:
- Rate limits are per Google Cloud project
- Images are still generated sequentially (1 at a time)
- Current settings (maxConcurrent: 1, 5s delay) are optimal

To further reduce 429 errors:
- Increase `delayBetweenRequests` in imageGenerator.js
- Reduce number of perspectives generated
- Upgrade Vertex AI quota

## Migration

The old polling-based endpoint (`POST /api/generate/:sessionId`) still works for backward compatibility. To use streaming:

1. Change from POST to GET
2. Use EventSource instead of fetch
3. Handle events instead of polling

## Example Timeline

For 7 ring perspectives:

```
0:00 - Start event
0:01 - Master prompts phase (parallel, ~5-10s)
0:10 - Image generation phase starts
0:15 - Image 1 appears (ring1)
0:20 - Image 2 appears (ring2)
0:25 - Image 3 appears (ring3)
... (5 seconds between each due to rate limiting)
0:50 - Image 7 appears (ring7)
0:50 - Complete event
```

With streaming, users see the first image at 0:15 instead of waiting until 0:50!
