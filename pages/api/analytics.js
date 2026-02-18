import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'analytics.json');

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading analytics data:', error);
  }
  return { pageViews: [], dailyStats: {} };
}

function saveData(data) {
  try {
    // Keep only last 30 days of detailed page views to prevent file bloat
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();
    
    if (data.pageViews) {
      data.pageViews = data.pageViews.filter(v => v.timestamp > cutoff);
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving analytics data:', error);
    return false;
  }
}

function getDateKey(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export default function handler(req, res) {
  // POST — record a page view
  if (req.method === 'POST') {
    try {
      const { page, referrer } = req.body;
      if (!page) return res.status(400).json({ error: 'Page path required' });

      // Skip tracking for admin pages and API routes
      if (page.startsWith('/admin') || page.startsWith('/api')) {
        return res.status(200).json({ success: true, skipped: true });
      }

      const data = loadData();
      const now = new Date();
      const dateKey = getDateKey(now);

      // Add to detailed page views
      data.pageViews.push({
        page,
        referrer: referrer || '',
        timestamp: now.toISOString(),
        userAgent: req.headers['user-agent'] || '',
      });

      // Update daily stats
      if (!data.dailyStats[dateKey]) {
        data.dailyStats[dateKey] = { totalViews: 0, uniquePages: {}, referrers: {} };
      }
      data.dailyStats[dateKey].totalViews++;
      data.dailyStats[dateKey].uniquePages[page] = (data.dailyStats[dateKey].uniquePages[page] || 0) + 1;
      if (referrer) {
        try {
          const refHost = new URL(referrer).hostname;
          data.dailyStats[dateKey].referrers[refHost] = (data.dailyStats[dateKey].referrers[refHost] || 0) + 1;
        } catch { /* invalid url */ }
      }

      // Clean up old daily stats (keep 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const oldCutoff = getDateKey(ninetyDaysAgo);
      for (const key of Object.keys(data.dailyStats)) {
        if (key < oldCutoff) delete data.dailyStats[key];
      }

      saveData(data);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Analytics tracking error:', error);
      return res.status(200).json({ success: true }); // Don't fail the page load
    }
  }

  // GET — return analytics summary
  if (req.method === 'GET') {
    try {
      const data = loadData();
      const now = new Date();
      const todayKey = getDateKey(now);
      
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = getDateKey(yesterday);

      // Calculate period stats
      const todayStats = data.dailyStats[todayKey] || { totalViews: 0, uniquePages: {}, referrers: {} };
      const yesterdayStats = data.dailyStats[yesterdayKey] || { totalViews: 0, uniquePages: {}, referrers: {} };

      // This week (last 7 days)
      let weekViews = 0;
      const weekPages = {};
      const weekReferrers = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = getDateKey(d);
        const dayStats = data.dailyStats[key];
        if (dayStats) {
          weekViews += dayStats.totalViews;
          for (const [page, count] of Object.entries(dayStats.uniquePages || {})) {
            weekPages[page] = (weekPages[page] || 0) + count;
          }
          for (const [ref, count] of Object.entries(dayStats.referrers || {})) {
            weekReferrers[ref] = (weekReferrers[ref] || 0) + count;
          }
        }
      }

      // This month (last 30 days)
      let monthViews = 0;
      const monthPages = {};
      for (let i = 0; i < 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = getDateKey(d);
        const dayStats = data.dailyStats[key];
        if (dayStats) {
          monthViews += dayStats.totalViews;
          for (const [page, count] of Object.entries(dayStats.uniquePages || {})) {
            monthPages[page] = (monthPages[page] || 0) + count;
          }
        }
      }

      // Daily chart data (last 14 days)
      const chartData = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = getDateKey(d);
        const dayStats = data.dailyStats[key];
        chartData.push({
          date: key,
          label: d.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' }),
          views: dayStats?.totalViews || 0,
        });
      }

      // Top pages (week)
      const topPages = Object.entries(weekPages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([page, views]) => ({ page, views }));

      // Top referrers (week)
      const topReferrers = Object.entries(weekReferrers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([referrer, views]) => ({ referrer, views }));

      return res.status(200).json({
        success: true,
        today: {
          views: todayStats.totalViews,
          topPage: Object.entries(todayStats.uniquePages || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '-',
        },
        yesterday: {
          views: yesterdayStats.totalViews,
        },
        week: {
          views: weekViews,
        },
        month: {
          views: monthViews,
        },
        chartData,
        topPages,
        topReferrers,
      });
    } catch (error) {
      console.error('Analytics read error:', error);
      return res.status(500).json({ success: false, error: 'Failed to read analytics' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
