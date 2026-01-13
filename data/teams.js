// Team profiles data management
let teamProfiles = [];
let teamIdCounter = 1;
let teamRevenue = {}; // Structure: { teamId: [{ type, amount, date, details }] }
let payoutRequests = []; // Array of payout requests
let payoutIdCounter = 1;

// Get all team profiles
export function getAllTeamProfiles() {
  return teamProfiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Get team by ID
export function getTeamById(id) {
  return teamProfiles.find(team => team.id === id);
}

// Get team by email
export function getTeamByEmail(email) {
  return teamProfiles.find(team => team.email?.toLowerCase() === email.toLowerCase());
}

// Get team by team name
export function getTeamByName(teamName) {
  return teamProfiles.find(team => team.teamName?.toLowerCase() === teamName.toLowerCase());
}

// Create team profile (from form submission)
export function createTeamProfile(submissionData, formSubmissionId) {
  const newTeam = {
    id: teamIdCounter++,
    formSubmissionId,
    teamName: submissionData.teamName || submissionData['team-name'] || '',
    managerName: submissionData.managerName || submissionData['team-manager-name'] || submissionData.coachName || '',
    managerPhone: submissionData.managerPhone || submissionData['manager-phone'] || '',
    email: submissionData.email || submissionData['coach-email'] || '',
    phone: submissionData.phone || submissionData['coach-phone'] || '',
    password: generateTemporaryPassword(),
    submissionData, // Store all original form data
    status: 'pending', // pending, approved, active, suspended
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: null,
    players: [], // Can add players later
    documents: [], // Store team documents
    messages: [], // Admin messages to team
    fixtures: [], // Assigned fixtures
    payments: [] // Payment records
  };

  teamProfiles.push(newTeam);
  return newTeam;
}

// Generate temporary password
function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Update team profile
export function updateTeamProfile(id, updates) {
  const index = teamProfiles.findIndex(t => t.id === id);
  if (index !== -1) {
    teamProfiles[index] = {
      ...teamProfiles[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return teamProfiles[index];
  }
  return null;
}

// Update team password
export function updateTeamPassword(id, newPassword) {
  const team = getTeamById(id);
  if (team) {
    team.password = newPassword;
    team.updatedAt = new Date().toISOString();
    return team;
  }
  return null;
}

// Update team email
export function updateTeamEmail(teamId, newEmail) {
  const team = getTeamById(teamId);
  if (team) {
    team.email = newEmail;
    team.updatedAt = new Date().toISOString();
  }
  return team;
}

// Update team banking details
export function updateTeamBankingDetails(teamId, bankingDetails) {
  const team = getTeamById(teamId);
  if (team) {
    team.bankingDetails = {
      accountHolder: bankingDetails.accountHolder,
      bankName: bankingDetails.bankName,
      accountNumber: bankingDetails.accountNumber,
      branchCode: bankingDetails.branchCode,
      accountType: bankingDetails.accountType,
      updatedAt: new Date().toISOString()
    };
    team.updatedAt = new Date().toISOString();
  }
  return team;
}

// Verify team credentials
export function verifyTeamCredentials(identifier, password) {
  // Find by email or team name
  const team = teamProfiles.find(t => 
    t.email?.toLowerCase() === identifier.toLowerCase() || 
    t.teamName?.toLowerCase() === identifier.toLowerCase()
  );
  
  if (team && team.password === password) {
    // Update last login
    team.lastLogin = new Date().toISOString();
    return team;
  }
  return null;
}

// Add player to team
export function addPlayerToTeam(teamId, playerData) {
  const team = getTeamById(teamId);
  if (team) {
    const newPlayer = {
      id: Date.now(),
      ...playerData,
      addedAt: new Date().toISOString()
    };
    team.players.push(newPlayer);
    team.updatedAt = new Date().toISOString();
    return newPlayer;
  }
  return null;
}

// Remove player from team
export function removePlayerFromTeam(teamId, playerId) {
  const team = getTeamById(teamId);
  if (team) {
    team.players = team.players.filter(p => p.id !== playerId);
    team.updatedAt = new Date().toISOString();
    return true;
  }
  return false;
}

// Move player to different sub-team
export function movePlayerToSubTeam(teamId, playerId, newSubTeam) {
  const team = getTeamById(teamId);
  if (team) {
    const player = team.players.find(p => p.id === playerId);
    if (player) {
      player.subTeam = newSubTeam;
      team.updatedAt = new Date().toISOString();
      return true;
    }
  }
  return false;
}

// Duplicate player to another sub-team
export function duplicatePlayerToSubTeam(teamId, playerId, newSubTeam) {
  const team = getTeamById(teamId);
  if (team) {
    const player = team.players.find(p => p.id === playerId);
    if (player) {
      const duplicatedPlayer = {
        ...player,
        id: Date.now() + Math.random(), // Ensure unique ID
        subTeam: newSubTeam,
        addedAt: new Date().toISOString()
      };
      team.players.push(duplicatedPlayer);
      team.updatedAt = new Date().toISOString();
      return duplicatedPlayer;
    }
  }
  return null;
}

// Add document to team
export function addTeamDocument(teamId, document) {
  const team = getTeamById(teamId);
  if (team) {
    const newDoc = {
      id: Date.now(),
      ...document,
      uploadedAt: new Date().toISOString()
    };
    team.documents.push(newDoc);
    team.updatedAt = new Date().toISOString();
    return newDoc;
  }
  return null;
}

// Add message for team
export function addTeamMessage(teamId, message, fromAdmin = true) {
  const team = getTeamById(teamId);
  if (team) {
    const newMessage = {
      id: Date.now(),
      message,
      fromAdmin,
      read: false,
      createdAt: new Date().toISOString()
    };
    team.messages.push(newMessage);
    team.updatedAt = new Date().toISOString();
    return newMessage;
  }
  return null;
}

// Mark message as read
export function markMessageAsRead(teamId, messageId) {
  const team = getTeamById(teamId);
  if (team) {
    const message = team.messages.find(m => m.id === messageId);
    if (message) {
      message.read = true;
      return true;
    }
  }
  return false;
}

// Get unread message count
export function getUnreadMessageCount(teamId) {
  const team = getTeamById(teamId);
  if (team) {
    return team.messages.filter(m => !m.read).length;
  }
  return 0;
}

// Add fixture to team
export function addTeamFixture(teamId, fixture) {
  const team = getTeamById(teamId);
  if (team) {
    const newFixture = {
      id: Date.now(),
      ...fixture,
      addedAt: new Date().toISOString()
    };
    team.fixtures.push(newFixture);
    team.updatedAt = new Date().toISOString();
    return newFixture;
  }
  return null;
}

// Add payment record
export function addTeamPayment(teamId, payment) {
  const team = getTeamById(teamId);
  if (team) {
    const newPayment = {
      id: Date.now(),
      ...payment,
      recordedAt: new Date().toISOString()
    };
    team.payments.push(newPayment);
    team.updatedAt = new Date().toISOString();
    return newPayment;
  }
  return null;
}

// Update team status
export function updateTeamStatus(teamId, status) {
  const team = getTeamById(teamId);
  if (team) {
    team.status = status;
    team.updatedAt = new Date().toISOString();
    return team;
  }
  return null;
}

// Delete team profile
export function deleteTeamProfile(id) {
  const index = teamProfiles.findIndex(t => t.id === id);
  if (index !== -1) {
    teamProfiles.splice(index, 1);
    return true;
  }
  return false;
}

// Get team statistics
export function getTeamStats() {
  return {
    total: teamProfiles.length,
    pending: teamProfiles.filter(t => t.status === 'pending').length,
    approved: teamProfiles.filter(t => t.status === 'approved').length,
    active: teamProfiles.filter(t => t.status === 'active').length,
    suspended: teamProfiles.filter(t => t.status === 'suspended').length
  };
}

// Add player registration markup revenue to team
// NOTE: Always use the main team's ID (from field 8 in player registration form)
// Sub-team selection (field 34) is for organizational purposes only
// All revenue aggregates to the main team regardless of which sub-team the player joins
export function addPlayerRegistrationRevenue(teamId, playerName, markup, submissionId) {
  if (!teamRevenue[teamId]) {
    teamRevenue[teamId] = [];
  }
  
  const revenueEntry = {
    id: Date.now(),
    type: 'player-registration-markup',
    amount: parseFloat(markup),
    playerName,
    submissionId,
    date: new Date().toISOString(),
    details: `Player registration markup for ${playerName}`
  };
  
  teamRevenue[teamId].push(revenueEntry);
  return revenueEntry;
}

// Add product commission to team (10% of product sales from team customers)
// NOTE: Commission is always credited to the main team, not individual sub-teams
export function addProductCommission(teamId, customerName, orderTotal, orderNumber) {
  if (!teamRevenue[teamId]) {
    teamRevenue[teamId] = [];
  }
  
  const commission = orderTotal * 0.10; // 10% commission
  
  const revenueEntry = {
    id: Date.now(),
    type: 'product-commission',
    amount: commission,
    customerName,
    orderNumber,
    orderTotal,
    date: new Date().toISOString(),
    details: `10% commission from ${customerName}'s order #${orderNumber} (R${orderTotal.toFixed(2)})`
  };
  
  teamRevenue[teamId].push(revenueEntry);
  return revenueEntry;
}

// Helper function to get main team ID from player registration submission
// In player registration: field 8 = team dropdown (returns submission ID)
// The submission ID links to the team registration form submission
export function getMainTeamIdFromPlayerSubmission(playerSubmissionData) {
  // Field 8 contains the team registration submission ID
  const teamSubmissionId = playerSubmissionData[8];
  if (!teamSubmissionId) return null;
  
  // Find the team profile that was created from this submission
  const team = teamProfiles.find(t => t.formSubmissionId === parseInt(teamSubmissionId));
  return team ? team.id : null;
}

// Get all revenue for a team
export function getTeamRevenue(teamId) {
  return teamRevenue[teamId] || [];
}

// Get total revenue for a team
export function getTeamTotalRevenue(teamId) {
  const revenue = teamRevenue[teamId] || [];
  return revenue.reduce((sum, entry) => sum + entry.amount, 0);
}

// Get revenue breakdown by type
export function getTeamRevenueBreakdown(teamId) {
  const revenue = teamRevenue[teamId] || [];
  
  const markup = revenue
    .filter(r => r.type === 'player-registration-markup')
    .reduce((sum, r) => sum + r.amount, 0);
    
  const commission = revenue
    .filter(r => r.type === 'product-commission')
    .reduce((sum, r) => sum + r.amount, 0);
  
  return {
    markup,
    commission,
    total: markup + commission
  };
}

// Payout request functions
export function createPayoutRequest(teamId) {
  const team = getTeamById(teamId);
  if (!team) return null;
  
  const totalRevenue = getTeamTotalRevenue(teamId);
  if (totalRevenue <= 0) return null;
  
  const breakdown = getTeamRevenueBreakdown(teamId);
  
  const payoutRequest = {
    id: payoutIdCounter++,
    teamId,
    teamName: team.teamName,
    coachName: team.coachName,
    email: team.email,
    phone: team.phone,
    amount: totalRevenue,
    breakdown,
    bankingDetails: team.bankingDetails || null,
    status: 'pending', // pending, approved, rejected, paid
    requestedAt: new Date().toISOString(),
    processedAt: null,
    processedBy: null,
    notes: ''
  };
  
  payoutRequests.push(payoutRequest);
  return payoutRequest;
}

export function getAllPayoutRequests() {
  return payoutRequests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
}

export function getPendingPayoutRequests() {
  return payoutRequests.filter(r => r.status === 'pending');
}

export function getPayoutRequestById(id) {
  return payoutRequests.find(r => r.id === id);
}

export function getPayoutRequestsByTeam(teamId) {
  return payoutRequests.filter(r => r.teamId === teamId);
}

export function getPendingPayoutForTeam(teamId) {
  return payoutRequests.find(r => r.teamId === teamId && r.status === 'pending');
}

export function approvePayoutRequest(requestId, notes = '') {
  const request = getPayoutRequestById(requestId);
  if (!request || request.status !== 'pending') return null;
  
  request.status = 'approved';
  request.processedAt = new Date().toISOString();
  request.notes = notes;
  
  return request;
}

export function processPayout(requestId, notes = '') {
  const request = getPayoutRequestById(requestId);
  if (!request || request.status === 'paid') return null;
  
  // Clear team revenue
  teamRevenue[request.teamId] = [];
  
  // Update request status
  request.status = 'paid';
  request.processedAt = new Date().toISOString();
  request.notes = notes;
  
  // Add to team payment records
  const team = getTeamById(request.teamId);
  if (team) {
    if (!team.payouts) team.payouts = [];
    team.payouts.push({
      id: Date.now(),
      amount: request.amount,
      breakdown: request.breakdown,
      paidAt: new Date().toISOString(),
      notes
    });
  }
  
  return request;
}

export function rejectPayoutRequest(requestId, notes = '') {
  const request = getPayoutRequestById(requestId);
  if (!request || request.status !== 'pending') return null;
  
  request.status = 'rejected';
  request.processedAt = new Date().toISOString();
  request.notes = notes;
  
  return request;
}

// Sample data for development
teamProfiles = [
  {
    id: 1,
    formSubmissionId: 1,
    teamName: 'Lions Rugby Club',
    managerName: 'John Smith',
    managerPhone: '0821234567',
    email: 'john@lionsrugby.com',
    phone: '0821234567',
    password: 'TEMP1234',
    submissionData: {
      1: 'Lions Rugby Club',
      2: 'John Smith',
      35: '0821234567',
      3: 'john@lionsrugby.com',
      32: 5, // Number of teams
      33: [ // Sub-teams array
        {
          teamNumber: 1,
          teamName: 'Lions Junior',
          gender: 'Male',
          ageGroup: 'U9',
          coachName: 'Mike Roberts',
          coachContact: '0823456789'
        },
        {
          teamNumber: 2,
          teamName: 'Lions Colts',
          gender: 'Male',
          ageGroup: 'U13',
          coachName: 'Sarah Thompson',
          coachContact: '0824567890'
        },
        {
          teamNumber: 3,
          teamName: 'Lions Youth',
          gender: 'Male',
          ageGroup: 'U15',
          coachName: 'David Williams',
          coachContact: '0825678901'
        },
        {
          teamNumber: 4,
          teamName: 'Lions Ladies',
          gender: 'Female',
          ageGroup: 'U17',
          coachName: 'Emma Davis',
          coachContact: '0826789012'
        },
        {
          teamNumber: 5,
          teamName: 'Lions First Team',
          gender: 'Male',
          ageGroup: 'Senior',
          coachName: 'James Cooper',
          coachContact: '0827890123'
        }
      ],
      5: 'Lions Stadium',
      teamName: 'Lions Rugby Club',
      coachName: 'John Smith',
      email: 'john@lionsrugby.com',
      phone: '0821234567',
      kitDesignId: 2,
      primaryColor: '#dc0000',
      secondaryColor: '#ffffff'
    },
    bankingDetails: {
      accountHolder: 'Lions Rugby Club',
      bankName: 'FNB (First National Bank)',
      accountNumber: '62847593021',
      branchCode: '250655',
      accountType: 'Cheque'
    },
    status: 'active',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    players: [
      {
        id: 1,
        name: 'Jake Mitchell',
        position: 'Scrum-half',
        jerseyNumber: 9,
        shirtNumber: 9,
        roles: ['Batsman', 'Bowler'],
        subTeam: 'Lions Junior',
        ageGroup: 'U9',
        gender: 'Male',
        addedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        name: 'Luke Peters',
        position: 'Wing',
        jerseyNumber: 14,
        shirtNumber: 14,
        roles: ['Batsman'],
        subTeam: 'Lions Junior',
        ageGroup: 'U9',
        gender: 'Male',
        addedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        name: 'Mike Johnson',
        position: 'Centre',
        jerseyNumber: 12,
        shirtNumber: 12,
        roles: ['All Rounder'],
        subTeam: 'Lions Colts',
        ageGroup: 'U13',
        gender: 'Male',
        addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        name: 'Chris Brown',
        position: 'Flanker',
        jerseyNumber: 7,
        shirtNumber: 7,
        roles: ['Bowler'],
        subTeam: 'Lions Colts',
        ageGroup: 'U13',
        gender: 'Male',
        addedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 5,
        name: 'Daniel Lee',
        position: 'Fly-half',
        jerseyNumber: 10,
        shirtNumber: 10,
        roles: ['Batsman', 'All Rounder'],
        subTeam: 'Lions Youth',
        ageGroup: 'U15',
        gender: 'Male',
        addedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 6,
        name: 'Sarah Lee',
        position: 'Centre',
        jerseyNumber: 13,
        shirtNumber: 13,
        roles: ['Batsman'],
        subTeam: 'Lions Ladies',
        ageGroup: 'U17',
        gender: 'Female',
        addedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 7,
        name: 'Emma Davis',
        position: 'Wing',
        jerseyNumber: 11,
        shirtNumber: 11,
        roles: ['All Rounder'],
        subTeam: 'Lions Ladies',
        ageGroup: 'U17',
        gender: 'Female',
        addedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 8,
        name: 'Tom Wilson',
        position: 'Prop',
        jerseyNumber: 3,
        shirtNumber: 3,
        roles: ['Bowler'],
        subTeam: 'Lions First Team',
        ageGroup: 'Senior',
        gender: 'Male',
        addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 9,
        name: 'James Cooper',
        position: 'Lock',
        jerseyNumber: 4,
        shirtNumber: 4,
        roles: ['Batsman', 'Bowler'],
        subTeam: 'Lions First Team',
        ageGroup: 'Senior',
        gender: 'Male',
        addedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    documents: [],
    messages: [
      {
        id: 1,
        message: 'Welcome to the league! Your team has been approved and all 5 age group teams have been registered successfully.',
        fromAdmin: true,
        read: true,
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        message: 'Your first fixtures for all age groups will be released next week. Please ensure all sub-teams are ready.',
        fromAdmin: true,
        read: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    fixtures: [
      {
        id: 1,
        opponent: 'Sharks Rugby Club',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        time: '10:00 AM',
        venue: 'Central Cricket Ground',
        addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    payments: [
      {
        id: 1,
        amount: 2500,
        description: 'Team Registration Fee - 5 Age Groups',
        status: 'paid',
        recordedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    payouts: []
  }
];

teamIdCounter = 2;

// Sample revenue data for testing
// In production, this would be stored in a database
// Revenue for Lions Rugby Club aggregates from all 5 sub-teams
teamRevenue[1] = [
  {
    id: 1,
    type: 'player-registration-markup',
    amount: 50,
    playerName: 'Mike Johnson - Lions Junior U9',
    submissionId: 101,
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    details: 'Player registration markup for Mike Johnson (Lions Junior U9)'
  },
  {
    id: 2,
    type: 'player-registration-markup',
    amount: 75,
    playerName: 'Tom Wilson - Lions First Team',
    submissionId: 102,
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    details: 'Player registration markup for Tom Wilson (Lions First Team)'
  },
  {
    id: 3,
    type: 'player-registration-markup',
    amount: 60,
    playerName: 'Sarah Lee - Lions Ladies U17',
    submissionId: 103,
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    details: 'Player registration markup for Sarah Lee (Lions Ladies U17)'
  },
  {
    id: 4,
    type: 'product-commission',
    amount: 45.50,
    customerName: 'Parent - Lions Colts',
    orderNumber: 'WL-1001',
    orderTotal: 455,
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    details: '10% commission from Lions Colts parent order #WL-1001 (R455.00)'
  },
  {
    id: 5,
    type: 'product-commission',
    amount: 32.80,
    customerName: 'Supporter - Lions Club',
    orderNumber: 'WL-1002',
    orderTotal: 328,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    details: '10% commission from Lions supporter order #WL-1002 (R328.00)'
  }
];

// Sample payout request data - PENDING for testing
// Note: In production, this would be stored in a database
payoutRequests = [
  {
    id: 1,
    teamId: 1,
    teamName: 'Lions Rugby Club',
    managerName: 'John Smith',
    email: 'john@lionsrugby.com',
    phone: '0821234567',
    amount: 263.30,
    breakdown: {
      markup: 185,
      commission: 78.30,
      total: 263.30
    },
    bankingDetails: {
      accountHolder: 'Lions Rugby Club',
      bankName: 'FNB (First National Bank)',
      accountNumber: '62847593021',
      branchCode: '250655',
      accountType: 'Cheque'
    },
    status: 'pending',
    requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    processedAt: null,
    processedBy: null,
    notes: ''
  }
];

payoutIdCounter = 2;
