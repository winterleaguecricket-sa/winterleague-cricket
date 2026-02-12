// Landing pages data for forms
let landingPages = {
  1: { // Team Registration
    id: 1,
    formId: 1,
    enabled: true,
    heroSection: {
      title: 'Register Your Team',
      subtitle: 'Join the league and compete with the best teams in the region',
      backgroundImage: '/images/team-hero.jpg',
      overlayColor: 'rgba(220, 0, 0, 0.85)',
      ctaText: 'Start Registration',
      ctaColor: '#dc0000'
    },
    features: [
      {
        icon: 'teams',
        title: 'Multi-Team Support',
        description: 'Register up to 20 age group teams under one organization'
      },
      {
        icon: 'palette',
        title: 'Custom Kit Design',
        description: 'Choose from our library of shirt designs and customize your team colors'
      },
      {
        icon: 'trending',
        title: 'Flexible Pricing',
        description: 'Set your own markup and entry fees for your team members'
      },
      {
        icon: 'compass',
        title: 'Team Portal',
        description: 'Access your dashboard to manage players, fixtures, and revenue'
      }
    ],
    benefits: {
      title: 'Why Join Our League?',
      items: [
        'Professional league management system',
        'Dedicated team portal for easy administration',
        'Revenue tracking and payout system',
        'Custom branding for your team',
        'Support for multiple age groups',
        'Secure player registration system'
      ]
    },
    testimonials: [
      {
        quote: 'The registration process was smooth and the team portal makes managing our 5 age groups so much easier!',
        author: 'Lions Rugby Club',
        role: 'Team Manager'
      },
      {
        quote: 'Love the custom kit options and the revenue tracking feature. Highly recommend!',
        author: 'Tigers Sports Academy',
        role: 'Club Director'
      }
    ],
    stats: [
      { number: '100+', label: 'Teams Registered' },
      { number: '2,500+', label: 'Active Players' },
      { number: '15', label: 'Age Categories' },
      { number: '24/7', label: 'Support Available' }
    ]
  },
  2: { // Player Registration
    id: 2,
    formId: 2,
    enabled: true,
    heroSection: {
      title: 'Join Your Team',
      subtitle: 'Register as a player and get ready for an exciting season ahead',
      backgroundImage: '/images/player-hero.jpg',
      overlayColor: 'rgba(220, 0, 0, 0.85)',
      ctaText: 'Register Now',
      ctaColor: '#dc0000'
    },
    features: [
      {
        icon: '⚡',
        title: 'Quick Registration',
        description: 'Simple 3-step process to get you registered and ready to play'
      },
      {
        icon: '👕',
        title: 'Get Your Kit',
        description: 'Order your team kit and additional equipment all in one place'
      },
      {
        icon: '🎯',
        title: 'Choose Your Role',
        description: 'Your team manager will assign your playing roles and shirt number'
      },
      {
        icon: '🏆',
        title: 'Track Your Stats',
        description: 'View your profile, fixtures, and team information in the portal'
      }
    ],
    benefits: {
      title: 'What You Get',
      items: [
        'Official team kit with custom design',
        'League insurance coverage included',
        'Access to professional facilities',
        'Full season league participation',
        'Player profile in team portal',
        'Optional supporter merchandise'
      ]
    },
    testimonials: [
      {
        quote: 'Registration was super easy and I got my kit within a week. Ready for the season!',
        author: 'Jake Mitchell',
        role: 'U9 Player'
      },
      {
        quote: 'Great experience! The kit quality is excellent and the ordering process was seamless.',
        author: 'Emma Davis',
        role: 'U17 Player'
      }
    ],
    stats: [
      { number: '2,500+', label: 'Active Players' },
      { number: '100+', label: 'Teams to Join' },
      { number: '3 Steps', label: 'Easy Registration' },
      { number: '7 Days', label: 'Average Kit Delivery' }
    ]
  }
};

// Get landing page by form ID
export function getLandingPageByFormId(formId) {
  return landingPages[formId] || null;
}

// Update landing page
export function updateLandingPage(formId, updates) {
  if (landingPages[formId]) {
    landingPages[formId] = {
      ...landingPages[formId],
      ...updates,
      heroSection: {
        ...landingPages[formId].heroSection,
        ...(updates.heroSection || {})
      },
      benefits: {
        ...landingPages[formId].benefits,
        ...(updates.benefits || {})
      }
    };
    return landingPages[formId];
  }
  return null;
}

// Toggle landing page enabled status
export function toggleLandingPage(formId, enabled) {
  if (landingPages[formId]) {
    landingPages[formId].enabled = enabled;
    return true;
  }
  return false;
}

// Update features
export function updateLandingPageFeatures(formId, features) {
  if (landingPages[formId]) {
    landingPages[formId].features = features;
    return true;
  }
  return false;
}

// Update testimonials
export function updateLandingPageTestimonials(formId, testimonials) {
  if (landingPages[formId]) {
    landingPages[formId].testimonials = testimonials;
    return true;
  }
  return false;
}

// Update stats
export function updateLandingPageStats(formId, stats) {
  if (landingPages[formId]) {
    landingPages[formId].stats = stats;
    return true;
  }
  return false;
}

// Get all landing pages
export function getAllLandingPages() {
  return Object.values(landingPages);
}
