import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'menu.json');

// Read menu from JSON file
function readMenuFromFile() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading menu file:', error);
  }
  return { menuItems: [] };
}

// Write menu to JSON file
function writeMenuToFile(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing menu file:', error);
    return false;
  }
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Return all menu items
    const data = readMenuFromFile();
    return res.status(200).json({ success: true, menuItems: data.menuItems });
  }
  
  if (req.method === 'POST') {
    // Add new menu item
    const data = readMenuFromFile();
    const newItem = {
      ...req.body,
      id: Math.max(...data.menuItems.map(m => m.id), 0) + 1,
      visible: true
    };
    data.menuItems.push(newItem);
    writeMenuToFile(data);
    return res.status(200).json({ success: true, menuItem: newItem });
  }
  
  if (req.method === 'PUT') {
    // Update existing menu item
    const { id, ...updates } = req.body;
    const data = readMenuFromFile();
    const index = data.menuItems.findIndex(m => m.id === id);
    if (index !== -1) {
      data.menuItems[index] = { ...data.menuItems[index], ...updates };
      writeMenuToFile(data);
      return res.status(200).json({ success: true, menuItem: data.menuItems[index] });
    }
    return res.status(404).json({ success: false, error: 'Menu item not found' });
  }
  
  if (req.method === 'DELETE') {
    // Delete menu item and its children
    const { id } = req.body;
    const data = readMenuFromFile();
    const itemsToDelete = [id];
    const children = data.menuItems.filter(item => item.parentId === id);
    children.forEach(child => itemsToDelete.push(child.id));
    data.menuItems = data.menuItems.filter(m => !itemsToDelete.includes(m.id));
    writeMenuToFile(data);
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
