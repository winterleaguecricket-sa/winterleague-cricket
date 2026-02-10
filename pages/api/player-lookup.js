// API to lookup players from CricClubs data
import fs from 'fs';
import path from 'path';

let playersCache = null;

function loadPlayers() {
  if (playersCache) return playersCache;
  
  try {
    const csvPath = path.join(process.cwd(), 'data', 'activePlayersExcelData.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    
    // Skip header rows (first 3 lines based on the file structure)
    const players = [];
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV - handle commas in fields
      const parts = line.split(',');
      if (parts.length < 3) continue;
      
      const sno = parts[0]?.trim();
      const playerName = parts[1]?.trim();
      const cricClubsId = parts[2]?.trim();
      const seriesName = parts[3]?.trim() || '';
      const dob = parts[4]?.trim() || '';
      const email = parts[5]?.trim() || '';
      const regDate = parts[6]?.trim() || '';
      const phone = parts[7]?.trim() || '';
      const team = parts[8]?.trim() || '';
      
      if (playerName && cricClubsId) {
        players.push({
          id: cricClubsId,
          name: playerName,
          series: seriesName,
          dob: dob,
          email: email,
          team: team,
          profileUrl: `https://www.cricclubs.com/Winterleaguecricket/viewPlayer.do?playerId=${cricClubsId}&clubId=5817`
        });
      }
    }
    
    playersCache = players;
    console.log(`Loaded ${players.length} players from CSV`);
    return players;
  } catch (error) {
    console.error('Error loading players:', error);
    return [];
  }
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { search } = req.query;
  
  if (!search || search.length < 2) {
    return res.status(200).json({ players: [], message: 'Enter at least 2 characters to search' });
  }
  
  const players = loadPlayers();
  const searchLower = search.toLowerCase().trim();
  
  // Split search into parts for better matching
  const searchParts = searchLower.split(/\s+/).filter(p => p.length > 0);
  
  // Find matching players
  const matches = players.filter(player => {
    const nameLower = player.name.toLowerCase();
    
    // Check if all search parts are found in the name
    return searchParts.every(part => nameLower.includes(part));
  });
  
  // Sort by relevance (exact match first, then starts with, then contains)
  matches.sort((a, b) => {
    const aLower = a.name.toLowerCase();
    const bLower = b.name.toLowerCase();
    
    // Exact match
    if (aLower === searchLower) return -1;
    if (bLower === searchLower) return 1;
    
    // Starts with search
    if (aLower.startsWith(searchLower) && !bLower.startsWith(searchLower)) return -1;
    if (bLower.startsWith(searchLower) && !aLower.startsWith(searchLower)) return 1;
    
    // Alphabetical
    return aLower.localeCompare(bLower);
  });
  
  // Limit results
  const limitedMatches = matches.slice(0, 10);
  
  return res.status(200).json({
    players: limitedMatches,
    totalMatches: matches.length,
    message: matches.length > 10 ? `Showing 10 of ${matches.length} matches` : null
  });
}
