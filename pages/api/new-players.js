// API to manage new players that need to be uploaded to CricClubs
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'newPlayers.json');

function loadNewPlayers() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading new players:', error);
  }
  return [];
}

function saveNewPlayers(players) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(players, null, 2));
  } catch (error) {
    console.error('Error saving new players:', error);
  }
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    const players = loadNewPlayers();
    return res.status(200).json({ players });
  }
  
  if (req.method === 'POST') {
    // Add a new player to the list (called from form submission)
    const { playerName, email, team, dob, submissionId } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const players = loadNewPlayers();
    
    // Check if player already exists by submission ID
    const exists = players.some(p => p.submissionId === submissionId);
    if (exists) {
      return res.status(200).json({ message: 'Player already recorded' });
    }
    
    const newPlayer = {
      id: Date.now().toString(),
      playerName,
      email: email || '',
      team: team || '',
      dob: dob || '',
      submissionId: submissionId || '',
      registrationDate: new Date().toISOString(),
      uploadedToCricClubs: false
    };
    
    players.push(newPlayer);
    saveNewPlayers(players);
    
    return res.status(201).json({ message: 'Player added', player: newPlayer });
  }
  
  if (req.method === 'PUT') {
    // Update player status (mark as uploaded)
    const { playerIds, status } = req.body;
    
    if (!playerIds || !Array.isArray(playerIds)) {
      return res.status(400).json({ error: 'Player IDs array required' });
    }
    
    const players = loadNewPlayers();
    const updatedPlayers = players.map(player => {
      if (playerIds.includes(player.id)) {
        return {
          ...player,
          uploadedToCricClubs: status === 'uploaded',
          uploadedDate: status === 'uploaded' ? new Date().toISOString() : null
        };
      }
      return player;
    });
    
    saveNewPlayers(updatedPlayers);
    
    return res.status(200).json({ message: 'Players updated' });
  }
  
  if (req.method === 'DELETE') {
    // Remove a player from the list
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID required' });
    }
    
    const players = loadNewPlayers();
    const filtered = players.filter(p => p.id !== playerId);
    saveNewPlayers(filtered);
    
    return res.status(200).json({ message: 'Player removed' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
