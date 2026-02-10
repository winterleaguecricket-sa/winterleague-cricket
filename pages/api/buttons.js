import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'buttons.json');

// Read buttons from JSON file
function readButtonsFromFile() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading buttons file:', error);
  }
  return { buttons: [] };
}

// Write buttons to JSON file
function writeButtonsToFile(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing buttons file:', error);
    return false;
  }
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    // Return all buttons
    const data = readButtonsFromFile();
    return res.status(200).json({ success: true, buttons: data.buttons });
  }
  
  if (req.method === 'POST') {
    // Add new button
    const data = readButtonsFromFile();
    const newButton = {
      ...req.body,
      id: Math.max(...data.buttons.map(b => b.id), 0) + 1
    };
    data.buttons.push(newButton);
    writeButtonsToFile(data);
    return res.status(200).json({ success: true, button: newButton });
  }
  
  if (req.method === 'PUT') {
    // Update existing button
    const { id, ...updates } = req.body;
    const data = readButtonsFromFile();
    const index = data.buttons.findIndex(b => b.id === id);
    if (index !== -1) {
      data.buttons[index] = { ...data.buttons[index], ...updates };
      writeButtonsToFile(data);
      return res.status(200).json({ success: true, button: data.buttons[index] });
    }
    return res.status(404).json({ success: false, error: 'Button not found' });
  }
  
  if (req.method === 'DELETE') {
    // Delete button
    const { id } = req.body;
    const data = readButtonsFromFile();
    data.buttons = data.buttons.filter(b => b.id !== id);
    writeButtonsToFile(data);
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
