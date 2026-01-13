export default async function handler(req, res) {
  const { username, videoUrl } = req.query;

  // If a specific video URL is provided, use that
  if (videoUrl) {
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
      const oembedResponse = await fetch(oembedUrl);

      if (!oembedResponse.ok) {
        throw new Error('Failed to fetch oEmbed data');
      }

      const oembedData = await oembedResponse.json();

      if (oembedData.html) {
        return res.status(200).json({
          success: true,
          embedHtml: oembedData.html,
          videoUrl: videoUrl,
          title: oembedData.title || '',
          author: oembedData.author_name || ''
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  if (!username) {
    return res.status(400).json({ error: 'Username or video URL is required' });
  }

  // Fallback - just return profile info
  const cleanUsername = username.replace('@', '');
  return res.status(200).json({
    success: false,
    message: 'Auto-fetch not available. Please provide a video URL.',
    profileUrl: `https://www.tiktok.com/@${cleanUsername}`
  });
}
