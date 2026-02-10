// API endpoint for landing pages
import { query } from '../../lib/db';

// Default landing pages data (used if database is empty)
const defaultLandingPages = {
  1: { // Team Registration
    id: 1,
    formId: 1,
    enabled: true,
    heroSection: {
      title: 'Register Your Team',
      subtitle: 'Join the league and compete with the best teams in the region',
      backgroundImage: '',
      overlayColor: 'rgba(220, 0, 0, 0.85)',
      ctaText: 'Start Registration',
      ctaColor: '#dc0000'
    },
    features: [
      { icon: 'teams', title: 'Multi-Team Support', description: 'Register up to 20 age group teams under one organization' },
      { icon: 'palette', title: 'Custom Kit Design', description: 'Choose from our library of shirt designs and customize your team colors' },
      { icon: 'trending', title: 'Flexible Pricing', description: 'Set your own markup and entry fees for your team members' },
      { icon: 'compass', title: 'Team Portal', description: 'Access your dashboard to manage players, fixtures, and revenue' }
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
      { quote: 'The registration process was smooth and the team portal makes managing our 5 age groups so much easier!', author: 'Lions Rugby Club', role: 'Team Manager' },
      { quote: 'Love the custom kit options and the revenue tracking feature. Highly recommend!', author: 'Tigers Sports Academy', role: 'Club Director' }
    ],
    testimonialsVisible: true,
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
      backgroundImage: '',
      overlayColor: 'rgba(220, 0, 0, 0.85)',
      ctaText: 'Register Now',
      ctaColor: '#dc0000'
    },
    features: [
      { icon: '⚡', title: 'Quick Registration', description: 'Simple 3-step process to get you registered and ready to play' },
      { icon: '👕', title: 'Get Your Kit', description: 'Order your team kit and additional equipment all in one place' },
      { icon: '🎯', title: 'Choose Your Role', description: 'Your team manager will assign your playing roles and shirt number' },
      { icon: '🏆', title: 'Track Your Stats', description: 'View your profile, fixtures, and team information in the portal' }
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
      { quote: 'Registration was super easy and I got my kit within a week. Ready for the season!', author: 'Jake Mitchell', role: 'U9 Player' },
      { quote: 'Great experience! The kit quality is excellent and the ordering process was seamless.', author: 'Emma Davis', role: 'U17 Player' }
    ],
    testimonialsVisible: true,
    stats: [
      { number: '2,500+', label: 'Active Players' },
      { number: '100+', label: 'Teams to Join' },
      { number: '3 Steps', label: 'Easy Registration' },
      { number: '7 Days', label: 'Average Kit Delivery' }
    ]
  }
};

// Convert database row to landing page format
function rowToLandingPage(row) {
  const content = row.content || {};
  return {
    id: row.id,
    formId: content.formId || parseInt(row.slug?.replace('form-', '')) || 1,
    enabled: row.active,
    heroSection: content.heroSection || defaultLandingPages[1].heroSection,
    features: content.features || defaultLandingPages[1].features,
    benefits: content.benefits || defaultLandingPages[1].benefits,
    testimonials: content.testimonials || defaultLandingPages[1].testimonials,
    testimonialsVisible: content.testimonialsVisible !== undefined ? content.testimonialsVisible : true,
    stats: content.stats || defaultLandingPages[1].stats
  };
}

export default async function handler(req, res) {
  const { formId } = req.query;

  if (req.method === 'GET') {
    try {
      if (formId) {
        // Try to get from database by slug
        const result = await query(
          'SELECT * FROM landing_pages WHERE slug = $1',
          [`form-${formId}`]
        );

        if (result.rows.length > 0) {
          return res.status(200).json(rowToLandingPage(result.rows[0]));
        }
        
        // Return default if not in database
        const defaultPage = defaultLandingPages[formId];
        if (defaultPage) {
          return res.status(200).json(defaultPage);
        }
        return res.status(404).json({ error: 'Landing page not found' });
      } else {
        // Get all landing pages - always return both form 1 and form 2
        const allResult = await query('SELECT * FROM landing_pages WHERE slug LIKE $1', ['form-%']);
        
        // Build a map of existing pages from database
        const dbPages = {};
        allResult.rows.forEach(row => {
          const page = rowToLandingPage(row);
          dbPages[page.formId] = page;
        });
        
        // Always return both forms (1 and 2), using database data if exists, otherwise defaults
        const pages = [1, 2].map(fId => {
          if (dbPages[fId]) {
            return dbPages[fId];
          }
          return defaultLandingPages[fId];
        });
        
        return res.status(200).json(pages);
      }
    } catch (error) {
      console.error('Database error, using defaults:', error);
      // Fallback to defaults if database fails
      if (formId) {
        const defaultPage = defaultLandingPages[formId];
        if (defaultPage) {
          return res.status(200).json(defaultPage);
        }
        return res.status(404).json({ error: 'Landing page not found' });
      }
      return res.status(200).json(Object.values(defaultLandingPages));
    }
  }

  if (req.method === 'PUT') {
    try {
      const { heroSection, features, benefits, testimonials, testimonialsVisible, stats, enabled } = req.body;
      const targetFormId = formId || req.body.formId;

      if (!targetFormId) {
        return res.status(400).json({ error: 'formId is required' });
      }

      const slug = `form-${targetFormId}`;

      // Check if landing page exists in database
      const existing = await query(
        'SELECT id, content FROM landing_pages WHERE slug = $1',
        [slug]
      );

      // Build content object
      const defaults = defaultLandingPages[targetFormId] || defaultLandingPages[1];
      let currentContent = existing.rows.length > 0 ? (existing.rows[0].content || {}) : {};
      
      const newContent = {
        formId: parseInt(targetFormId),
        heroSection: heroSection !== undefined ? heroSection : (currentContent.heroSection || defaults.heroSection),
        features: features !== undefined ? features : (currentContent.features || defaults.features),
        benefits: benefits !== undefined ? benefits : (currentContent.benefits || defaults.benefits),
        testimonials: testimonials !== undefined ? testimonials : (currentContent.testimonials || defaults.testimonials),
        testimonialsVisible: testimonialsVisible !== undefined ? testimonialsVisible : (currentContent.testimonialsVisible !== undefined ? currentContent.testimonialsVisible : true),
        stats: stats !== undefined ? stats : (currentContent.stats || defaults.stats)
      };

      if (existing.rows.length > 0) {
        // Update existing
        await query(
          `UPDATE landing_pages SET content = $1, active = $2, updated_at = NOW() WHERE slug = $3`,
          [JSON.stringify(newContent), enabled !== undefined ? enabled : true, slug]
        );
      } else {
        // Insert new
        await query(
          `INSERT INTO landing_pages (name, slug, content, active) VALUES ($1, $2, $3, $4)`,
          [
            `Form ${targetFormId} Landing Page`,
            slug,
            JSON.stringify(newContent),
            enabled !== undefined ? enabled : true
          ]
        );
      }

      // Return updated data
      const result = await query('SELECT * FROM landing_pages WHERE slug = $1', [slug]);

      if (result.rows.length > 0) {
        return res.status(200).json(rowToLandingPage(result.rows[0]));
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating landing page:', error);
      return res.status(500).json({ error: 'Failed to update landing page', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
