// API endpoint for shirt designs CRUD operations
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'shirtDesigns.json');

// Default shirt designs - empty array, real designs are in shirtDesigns.json
// managed via /admin/shirt-designs and served by this API
const defaultShirtDesigns = [];

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(fileData);
      // Ensure images array exists for backwards compatibility
      data.designs = data.designs.map(design => ({
        ...design,
        images: design.images || (design.imageUrl ? [design.imageUrl] : [])
      }));
      return data;
    }
  } catch (error) {
    console.error('Error loading shirt designs data:', error);
  }
  return { designs: defaultShirtDesigns, idCounter: 5 };
}

// Save data to file
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved shirt designs:', data.designs.length, 'designs');
    return true;
  } catch (error) {
    console.error('Error saving shirt designs data:', error);
    return false;
  }
}

export default function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET': {
      // Get all designs
      const data = loadData();
      const { activeOnly } = req.query;
      let designs = data.designs;
      
      if (activeOnly === 'true') {
        designs = designs.filter(design => design.active);
      }
      
      return res.status(200).json({ success: true, designs });
    }

    case 'POST': {
      // Add new design
      const data = loadData();
      const { name, images, active } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }

      const newDesign = {
        id: data.idCounter++,
        name,
        images: images || [],
        active: active !== undefined ? active : true,
        createdAt: new Date().toISOString()
      };

      data.designs.push(newDesign);
      
      if (saveData(data)) {
        return res.status(201).json({ success: true, design: newDesign });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to save design' });
      }
    }

    case 'PUT': {
      // Update existing design
      const data = loadData();
      const { id, ...updates } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }

      const index = data.designs.findIndex(design => design.id === parseInt(id));
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Design not found' });
      }

      data.designs[index] = { ...data.designs[index], ...updates };
      
      if (saveData(data)) {
        return res.status(200).json({ success: true, design: data.designs[index] });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to update design' });
      }
    }

    case 'DELETE': {
      // Delete design
      const data = loadData();
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }

      const index = data.designs.findIndex(design => design.id === parseInt(id));
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Design not found' });
      }

      data.designs.splice(index, 1);
      
      if (saveData(data)) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to delete design' });
      }
    }

    case 'PATCH': {
      // Toggle status
      const data = loadData();
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }

      const design = data.designs.find(d => d.id === parseInt(id));
      
      if (!design) {
        return res.status(404).json({ success: false, error: 'Design not found' });
      }

      design.active = !design.active;
      
      if (saveData(data)) {
        return res.status(200).json({ success: true, design });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to toggle status' });
      }
    }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
      return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
  }
}
