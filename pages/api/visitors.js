// In-memory store for active visitors (survives across requests, resets on server restart)
// Each visitor is keyed by a unique visitorId (generated client-side)
const activeVisitors = new Map();

// Clean up stale visitors (no heartbeat in 60 seconds)
function cleanStale() {
  const now = Date.now();
  for (const [id, visitor] of activeVisitors) {
    if (now - visitor.lastSeen > 60000) {
      activeVisitors.delete(id);
    }
  }
}

// Get geo info from IP using ip-api.com (free, no key needed, 45 req/min)
async function getGeoFromIP(ip) {
  // Skip local/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { country: 'Local', city: 'Local', countryCode: 'ZA', region: '' };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,lat,lon`, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return {
          country: data.country || 'Unknown',
          countryCode: data.countryCode || '',
          city: data.city || '',
          region: data.regionName || '',
          lat: data.lat,
          lon: data.lon
        };
      }
    }
  } catch (e) {
    // Geo lookup failed, not critical
  }
  return { country: 'Unknown', city: '', countryCode: '', region: '' };
}

function getClientIP(req) {
  // Check various headers for the real IP (behind nginx/proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || '';
}

export default async function handler(req, res) {
  // POST — heartbeat from a visitor
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { visitorId, page, _delete } = body;
      if (!visitorId) return res.status(400).json({ error: 'visitorId required' });

      // Handle sendBeacon unload signal
      if (_delete) {
        activeVisitors.delete(visitorId);
        return res.status(200).json({ success: true });
      }

      const ip = getClientIP(req);
      const userAgent = req.headers['user-agent'] || '';
      const now = Date.now();

      // Check if this visitor already exists
      const existing = activeVisitors.get(visitorId);
      if (existing) {
        // Update heartbeat
        existing.lastSeen = now;
        existing.page = page || existing.page;
        existing.pageHistory = existing.pageHistory || [];
        if (page && existing.pageHistory[existing.pageHistory.length - 1] !== page) {
          existing.pageHistory.push(page);
          if (existing.pageHistory.length > 10) existing.pageHistory.shift();
        }
      } else {
        // New visitor — get geo data
        const geo = await getGeoFromIP(ip);
        activeVisitors.set(visitorId, {
          visitorId,
          ip: ip.substring(0, 20), // truncate for privacy
          firstSeen: now,
          lastSeen: now,
          page: page || '/',
          pageHistory: [page || '/'],
          userAgent,
          device: parseDevice(userAgent),
          geo
        });
      }

      cleanStale();
      return res.status(200).json({ success: true, activeCount: activeVisitors.size });
    } catch (error) {
      console.error('Visitor tracking error:', error);
      return res.status(200).json({ success: true });
    }
  }

  // DELETE — visitor leaving (beforeunload)
  if (req.method === 'DELETE') {
    try {
      const { visitorId } = req.body;
      if (visitorId) activeVisitors.delete(visitorId);
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(200).json({ success: true });
    }
  }

  // GET — admin fetches active visitors
  if (req.method === 'GET') {
    cleanStale();

    const visitors = Array.from(activeVisitors.values()).map(v => ({
      visitorId: v.visitorId.substring(0, 8), // partial ID only
      page: v.page,
      pageHistory: v.pageHistory,
      device: v.device,
      geo: v.geo,
      firstSeen: v.firstSeen,
      lastSeen: v.lastSeen,
      duration: Math.round((Date.now() - v.firstSeen) / 1000)
    }));

    // Aggregate by location
    const locationMap = {};
    for (const v of visitors) {
      const key = v.geo?.city && v.geo?.country
        ? `${v.geo.city}, ${v.geo.country}`
        : v.geo?.country || 'Unknown';
      if (!locationMap[key]) {
        locationMap[key] = {
          location: key,
          country: v.geo?.country || 'Unknown',
          countryCode: v.geo?.countryCode || '',
          city: v.geo?.city || '',
          count: 0,
          lat: v.geo?.lat,
          lon: v.geo?.lon
        };
      }
      locationMap[key].count++;
    }

    const locations = Object.values(locationMap).sort((a, b) => b.count - a.count);

    // Device breakdown
    const devices = {};
    for (const v of visitors) {
      const d = v.device || 'Unknown';
      devices[d] = (devices[d] || 0) + 1;
    }

    // Current pages
    const pages = {};
    for (const v of visitors) {
      const p = v.page || '/';
      pages[p] = (pages[p] || 0) + 1;
    }
    const currentPages = Object.entries(pages)
      .sort((a, b) => b[1] - a[1])
      .map(([page, count]) => ({ page, count }));

    return res.status(200).json({
      success: true,
      totalActive: visitors.length,
      visitors,
      locations,
      devices,
      currentPages
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function parseDevice(ua) {
  if (!ua) return 'Unknown';
  const lower = ua.toLowerCase();
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) return 'Mobile';
  if (lower.includes('tablet') || lower.includes('ipad')) return 'Tablet';
  return 'Desktop';
}
