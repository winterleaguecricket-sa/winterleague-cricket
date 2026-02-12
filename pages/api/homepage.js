// API endpoint for homepage configuration CRUD operations
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'homepage.json');

// Default homepage configuration
const defaultConfig = {
  hero: {
    title: 'WINTER LEAGUE CRICKET',
    subtitle: 'Explore our premium cricket equipment collections',
    showAnimation: true,
    backgroundImage: '',
  },
  gallery: {
    enabled: true,
    title: 'Our World',
    subtitle: 'Experience the passion, power, and precision of cricket',
    images: [
      { id: 1, url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80', alt: 'Cricket Stadium' },
      { id: 2, url: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80', alt: 'Cricket Match' },
      { id: 3, url: 'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=800&q=80', alt: 'Cricket Equipment' },
      { id: 4, url: 'https://images.unsplash.com/photo-1593766787879-e8c78e09cec5?w=800&q=80', alt: 'Cricket Bat' },
      { id: 5, url: 'https://images.unsplash.com/photo-1545428207-928a50ca1c3b?w=800&q=80', alt: 'Cricket Action' },
      { id: 6, url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80', alt: 'Sports Arena' },
      { id: 7, url: 'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=800&q=80', alt: 'Cricket Field' },
      { id: 8, url: 'https://images.unsplash.com/photo-1611329532992-0b7d23da2e1a?w=800&q=80', alt: 'Cricket Gear' },
    ],
    imageIdCounter: 9,
  },
  channels: {
    enabled: true,
    title: 'PREMIUM CRICKET SUPPLIES',
    subtitle: 'Explore our premium cricket equipment collections',
    showTikTok: false,
    tiktokUsername: '',
    tiktokVideoUrl: '',
    tiktokEmbedCode: '',
    tiktokAutoLatest: false,
  },
  banner: {
    enabled: true,
    text: '🎉 FREE SHIPPING on orders over R500! 🎉',
  },
  siteAccess: {
    comingSoonEnabled: false,
    title: 'We’re getting things ready',
    subtitle: 'Thanks for your patience. We’re working on something great and will be live soon.',
    logoUrl: '',
    mediaType: 'none',
    mediaUrl: '',
  },
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(fileData);
      if (!data.siteAccess) {
        data.siteAccess = { ...defaultConfig.siteAccess };
      } else {
        data.siteAccess = { ...defaultConfig.siteAccess, ...data.siteAccess };
      }
      // Ensure imageIdCounter exists
      if (!data.gallery.imageIdCounter) {
        data.gallery.imageIdCounter = Math.max(...data.gallery.images.map(img => img.id), 0) + 1;
      }
      return data;
    }
  } catch (error) {
    console.error('Error loading homepage data:', error);
  }
  return JSON.parse(JSON.stringify(defaultConfig));
}

// Save data to file
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved homepage config');
    return true;
  } catch (error) {
    console.error('Error saving homepage data:', error);
    return false;
  }
}

export default function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET': {
      // Get homepage config
      const data = loadData();
      return res.status(200).json({ success: true, config: data });
    }

    case 'PUT': {
      // Update homepage config (hero, banner, channels, gallery settings)
      const data = loadData();
      const { section, updates } = req.body;
      
      if (!section || !updates) {
        return res.status(400).json({ success: false, error: 'Section and updates are required' });
      }

      if (section === 'hero') {
        data.hero = { ...data.hero, ...updates };
      } else if (section === 'banner') {
        data.banner = { ...data.banner, ...updates };
      } else if (section === 'channels') {
        data.channels = { ...data.channels, ...updates };
      } else if (section === 'siteAccess') {
        data.siteAccess = { ...data.siteAccess, ...updates };
      } else if (section === 'gallery') {
        // Only update gallery settings, not images
        data.gallery = { 
          ...data.gallery, 
          enabled: updates.enabled !== undefined ? updates.enabled : data.gallery.enabled,
          title: updates.title !== undefined ? updates.title : data.gallery.title,
          subtitle: updates.subtitle !== undefined ? updates.subtitle : data.gallery.subtitle,
        };
      } else {
        return res.status(400).json({ success: false, error: 'Invalid section' });
      }

      if (saveData(data)) {
        return res.status(200).json({ success: true, config: data });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to save config' });
      }
    }

    case 'POST': {
      // Add gallery image
      const data = loadData();
      const { url, alt } = req.body;
      
      if (!url || !alt) {
        return res.status(400).json({ success: false, error: 'URL and alt text are required' });
      }

      const newImage = {
        id: data.gallery.imageIdCounter++,
        url,
        alt
      };

      data.gallery.images.push(newImage);
      
      if (saveData(data)) {
        return res.status(201).json({ success: true, image: newImage, config: data });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to add image' });
      }
    }

    case 'PATCH': {
      // Update gallery image
      const data = loadData();
      const { id, url, alt } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Image ID is required' });
      }

      const index = data.gallery.images.findIndex(img => img.id === parseInt(id));
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Image not found' });
      }

      if (url) data.gallery.images[index].url = url;
      if (alt) data.gallery.images[index].alt = alt;
      
      if (saveData(data)) {
        return res.status(200).json({ success: true, image: data.gallery.images[index], config: data });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to update image' });
      }
    }

    case 'DELETE': {
      // Delete gallery image
      const data = loadData();
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Image ID is required' });
      }

      const index = data.gallery.images.findIndex(img => img.id === parseInt(id));
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Image not found' });
      }

      data.gallery.images.splice(index, 1);
      
      if (saveData(data)) {
        return res.status(200).json({ success: true, config: data });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to delete image' });
      }
    }

    default:
      res.setHeader('Allow', ['GET', 'PUT', 'POST', 'PATCH', 'DELETE']);
      return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
  }
}
