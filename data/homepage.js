// Homepage content configuration
let homepageConfig = {
  // Hero Section
  hero: {
    title: 'WINTER LEAGUE CRICKET',
    subtitle: 'Explore our premium cricket equipment collections',
    showAnimation: true,
    backgroundImage: '',
  },
  
  // Gallery Section
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
  },
  
  // Channel/Features Section
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
  
  // Banner
  banner: {
    enabled: true,
    text: '🎉 FREE SHIPPING on orders over R500! 🎉',
  },
  // Site Access
  siteAccess: {
    comingSoonEnabled: false,
    title: 'We’re getting things ready',
    subtitle: 'Thanks for your patience. We’re working on something great and will be live soon.',
    logoUrl: '',
    mediaType: 'none',
    mediaUrl: '',
  },
};

export function getHomepageConfig() {
  return { ...homepageConfig };
}

export function updateHomepageConfig(updates) {
  homepageConfig = {
    ...homepageConfig,
    ...updates,
    hero: updates.hero ? { ...homepageConfig.hero, ...updates.hero } : homepageConfig.hero,
    gallery: updates.gallery ? { ...homepageConfig.gallery, ...updates.gallery } : homepageConfig.gallery,
    channels: updates.channels ? { ...homepageConfig.channels, ...updates.channels } : homepageConfig.channels,
    banner: updates.banner ? { ...homepageConfig.banner, ...updates.banner } : homepageConfig.banner,
    siteAccess: updates.siteAccess ? { ...homepageConfig.siteAccess, ...updates.siteAccess } : homepageConfig.siteAccess,
  };
  return { ...homepageConfig };
}

export function addGalleryImage(image) {
  const newId = Math.max(...homepageConfig.gallery.images.map(img => img.id), 0) + 1;
  const newImage = { id: newId, ...image };
  homepageConfig.gallery.images.push(newImage);
  return newImage;
}

export function updateGalleryImage(id, updates) {
  const index = homepageConfig.gallery.images.findIndex(img => img.id === id);
  if (index !== -1) {
    homepageConfig.gallery.images[index] = {
      ...homepageConfig.gallery.images[index],
      ...updates,
    };
    return homepageConfig.gallery.images[index];
  }
  return null;
}

export function deleteGalleryImage(id) {
  const index = homepageConfig.gallery.images.findIndex(img => img.id === id);
  if (index !== -1) {
    homepageConfig.gallery.images.splice(index, 1);
    return true;
  }
  return false;
}
