import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
// Kit designs loaded via API (not local import which returns old defaults on client)

// API helper functions for database operations
const apiHelpers = {
  _adminMode: false,

  async verifyCredentials(identifier, password) {
    const res = await fetch('/api/team-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: identifier, password })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.team || null;
  },
  
  async getTeamById(teamId) {
    const showAll = this._adminMode ? '&showAll=true' : '';
    const res = await fetch(`/api/teams?id=${teamId}${showAll}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.team || null;
  },
  
  async getAllTeams() {
    const showAll = this._adminMode ? '&showAll=true' : '';
    const res = await fetch(`/api/teams?linkedOnly=true${showAll}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.teams || [];
  },
  
  async updatePassword(teamId, newPassword) {
    const res = await fetch('/api/team-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'changePassword', teamId, newPassword })
    });
    return res.ok;
  },
  
  async updateEmail(teamId, email) {
    const res = await fetch('/api/team-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'changeEmail', teamId, email })
    });
    return res.ok;
  },
  
  async updateBankingDetails(teamId, bankingDetails) {
    const res = await fetch('/api/teams', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: teamId, bankingDetails })
    });
    return res.ok;
  },
  
  async getRevenue(teamId) {
    const res = await fetch(`/api/team-finance?teamId=${teamId}&action=revenue`);
    if (!res.ok) return { total: 0, breakdown: {} };
    return res.json();
  },
  
  async createPayoutRequest(teamId) {
    const res = await fetch('/api/team-finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'createPayout', teamId })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.request || null;
  },
  
  async getPendingPayout(teamId) {
    const res = await fetch(`/api/team-finance?teamId=${teamId}&action=pendingPayout`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.request || null;
  },
  
  async getPayoutRequests(teamId) {
    const res = await fetch(`/api/team-finance?teamId=${teamId}&action=payouts`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.requests || [];
  },
  
  async movePlayer(teamId, playerId, newSubTeam) {
    const res = await fetch('/api/team-players', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', teamId, playerId, newSubTeam })
    });
    return res.ok;
  },
  
  async duplicatePlayer(teamId, playerId, newSubTeam) {
    const res = await fetch('/api/team-players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'duplicate', teamId, playerId, newSubTeam })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.player || null;
  },
  
  async updatePlayerRoles(teamId, playerId, roles) {
    const res = await fetch('/api/team-players', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateRoles', teamId, playerId, roles })
    });
    return res.ok;
  },

  async getRemovalRequests(teamId) {
    const res = await fetch(`/api/player-removal-requests?teamId=${teamId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.requests || [];
  },

  async requestPlayerRemoval(teamId, playerId, message) {
    const res = await fetch('/api/player-removal-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, playerId, message })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: true, message: data.error || 'Failed to submit removal request' };
    }
    return data.request || null;
  }
};

const portalIcons = {
  profile: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  ),
  players: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <path d="M2 20a6 6 0 0 1 12 0" />
      <path d="M10 20a6 6 0 0 1 12 0" />
    </svg>
  ),
  revenue: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h18v10H3Z" />
      <path d="M7 7V5h10v2" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  details: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h9l5 5v15H6Z" />
      <path d="M15 2v6h6" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  ),
  kit: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 5l4 3 4-3 3 2-2 4v10H7V11L5 7l3-2Z" />
    </svg>
  ),
  settings: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-0.2-.1a1.7 1.7 0 0 0-2 .3l-.2.2-3.6-2.1V17a1.7 1.7 0 0 0-1.4-1.7h-.2a1.7 1.7 0 0 0-1.7 1.4V17l-3.6 2.1-.2-.2a1.7 1.7 0 0 0-2-.3l-.2.1-1.8-3.1.1-.1a1.7 1.7 0 0 0 .3-1.9V15a1.7 1.7 0 0 0-1.4-1.7h-.2a1.7 1.7 0 0 0 0-3.4h.2A1.7 1.7 0 0 0 2.8 8V7a1.7 1.7 0 0 0-.3-1.9l-.1-.1L4.2 2l.2.1a1.7 1.7 0 0 0 2-.3l.2-.2 3.6 2.1V7a1.7 1.7 0 0 0 1.7 1.7h.2A1.7 1.7 0 0 0 13.4 7V5l3.6-2.1.2.2a1.7 1.7 0 0 0 2 .3l.2-.1 1.8 3.1-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.4 1.7h.2a1.7 1.7 0 0 0 0 3.4h-.2A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  ),
  banking: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10h18" />
      <path d="M4 10V8l8-4 8 4v2" />
      <path d="M5 10v8" />
      <path d="M9 10v8" />
      <path d="M15 10v8" />
      <path d="M19 10v8" />
      <path d="M4 18h16" />
    </svg>
  )
};

export default function TeamPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [team, setTeam] = useState(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [payoutMessage, setPayoutMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileTab, setProfileTab] = useState('details');
  const [adminViewTab, setAdminViewTab] = useState('directory');
  const [editEmail, setEditEmail] = useState('');
  const [bankingDetails, setBankingDetails] = useState({
    accountHolder: '',
    bankName: '',
    otherBankName: '',
    accountNumber: '',
    branchCode: '',
    accountType: 'Cheque'
  });
  const [bankingMessage, setBankingMessage] = useState('');
  const [playerActionMenu, setPlayerActionMenu] = useState(null); // { playerId, subTeamName }
  const [editingPlayerRoles, setEditingPlayerRoles] = useState(null); // { playerId, roles }
  const [playersView, setPlayersView] = useState('roster');
  const [removalRequests, setRemovalRequests] = useState([]);
  const [removalModal, setRemovalModal] = useState(null); // { player }
  const [removalMessage, setRemovalMessage] = useState('');
  const [removalError, setRemovalError] = useState('');
  const [removalSubmitting, setRemovalSubmitting] = useState(false);
  // Revenue data states
  const [revenueData, setRevenueData] = useState({ total: 0, registration: 0, merchandise: 0, other: 0 });
  const [pendingPayout, setPendingPayout] = useState(null);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [portalTemplate, setPortalTemplate] = useState({
    title: 'WL Team Portal',
    subtitle: 'Manage your team, players, fixtures, and revenue',
    headerStart: '#000000',
    headerEnd: '#dc0000'
  });
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previousTeam, setPreviousTeam] = useState(null);
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('');
  const [sponsorLogoUploading, setSponsorLogoUploading] = useState(false);
  const [sponsorLogoMessage, setSponsorLogoMessage] = useState('');
  const [kitDesignImageUrl, setKitDesignImageUrl] = useState('');
  const [kitDesignUploading, setKitDesignUploading] = useState(false);
  const [kitDesignMessage, setKitDesignMessage] = useState('');
  const [kitDesignDragActive, setKitDesignDragActive] = useState(false);
  const [allShirtDesigns, setAllShirtDesigns] = useState([]);
  // Age group team management
  const [showAddAgeGroup, setShowAddAgeGroup] = useState(false);
  const [newAgeGroup, setNewAgeGroup] = useState({ teamName: '', ageGroup: '', gender: '' });
  const [ageGroupSaving, setAgeGroupSaving] = useState(false);
  const [ageGroupMessage, setAgeGroupMessage] = useState('');
  const [deleteAgeGroupConfirm, setDeleteAgeGroupConfirm] = useState(null); // index to delete

  useEffect(() => {
    const loadPortalTemplate = async () => {
      try {
        const res = await fetch('/api/admin-settings');
        if (!res.ok) return;
        const data = await res.json();
        if (data?.teamPortalTemplate) {
          setPortalTemplate({
            title: data.teamPortalTemplate.title || 'WL Team Portal',
            subtitle: data.teamPortalTemplate.subtitle || 'Manage your team, players, fixtures, and revenue',
            headerStart: data.teamPortalTemplate.headerStart || '#000000',
            headerEnd: data.teamPortalTemplate.headerEnd || '#dc0000'
          });
        }
      } catch (error) {
        console.error('Error loading team portal template:', error);
      }
    };

    loadPortalTemplate();

    // Load shirt designs from API (not local import which returns old defaults on client)
    const loadShirtDesigns = async () => {
      try {
        const res = await fetch('/api/shirt-designs');
        if (res.ok) {
          const data = await res.json();
          setAllShirtDesigns(data.designs || []);
        }
      } catch (err) {
        console.error('Error loading shirt designs:', err);
      }
    };
    loadShirtDesigns();

    // Check for admin bypass or existing session
    const initializeSession = async () => {
      if (typeof window !== 'undefined') {
        // Check if admin wants to bypass login
        const urlParams = new URLSearchParams(window.location.search);
        const adminBypass = urlParams.get('admin') === 'true';
        
        if (adminBypass) {
          apiHelpers._adminMode = true;
          setIsAdminMode(true);
          setIsAuthenticated(true);
          setAdminViewTab('directory');
          const teams = await apiHelpers.getAllTeams();
          setAllTeams(teams);
          setIsPreviewMode(false);
          setTeam(null);
          setSelectedTeamId(null);
          return;
        }
        
        // Check for existing team session
        const savedTeamId = localStorage.getItem('teamId');
        if (savedTeamId) {
          const teamData = await apiHelpers.getTeamById(parseInt(savedTeamId));
          if (teamData) {
            setTeam(teamData);
            setIsAuthenticated(true);
          }
        }
      }
    };
    initializeSession();
  }, []);

  useEffect(() => {
    if (!team) return;
    const existingLogo = team.sponsorLogo || team.submissionData?.[30] || team.submissionData?.['30'] || '';
    setSponsorLogoUrl(existingLogo || '');
    const existingKitImage = team.submissionData?.kitDesignImageUrl || team.submissionData?.kitDesignImage || '';
    setKitDesignImageUrl(existingKitImage || '');
  }, [team]);

  // Auto-refresh when switching to revenue tab
  useEffect(() => {
    if (activeTab === 'revenue' && team) {
      handleRefreshData();
    }
  }, [activeTab]);

  // Load revenue data when team changes or on refresh
  useEffect(() => {
    const loadRevenueData = async () => {
      if (team?.id) {
        const revenue = await apiHelpers.getRevenue(team.id);
        setRevenueData(revenue);
        const pending = await apiHelpers.getPendingPayout(team.id);
        setPendingPayout(pending);
        const history = await apiHelpers.getPayoutRequests(team.id);
        setPayoutHistory(history.filter(r => r.status === 'paid'));
      }
    };
    loadRevenueData();
  }, [team?.id, refreshKey]);

  useEffect(() => {
    const loadRemovalRequests = async () => {
      if (team?.id) {
        const requests = await apiHelpers.getRemovalRequests(team.id);
        setRemovalRequests(requests);
      }
    };
    loadRemovalRequests();
  }, [team?.id, refreshKey]);

  // Initialize banking details and email when team changes
  useEffect(() => {
    if (team) {
      setEditEmail(team.email || '');
      if (team.bankingDetails) {
        const knownBanks = ['ABSA', 'African Bank', 'Bidvest Bank', 'Capitec Bank', 'Discovery Bank', 'FNB (First National Bank)', 'Grindrod Bank', 'Investec', 'Nedbank', 'Old Mutual Bank', 'Sasfin Bank', 'Standard Bank', 'TymeBank', 'Ubank'];
        const isKnownBank = knownBanks.includes(team.bankingDetails.bankName);
        
        setBankingDetails({
          ...team.bankingDetails,
          bankName: isKnownBank ? team.bankingDetails.bankName : 'Other',
          otherBankName: isKnownBank ? '' : team.bankingDetails.bankName
        });
      }
    }
  }, [team]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const teamData = await apiHelpers.verifyCredentials(identifier, password);
    if (teamData) {
      let fullTeam = teamData;
      if (teamData?.id) {
        const loadedTeam = await apiHelpers.getTeamById(teamData.id);
        if (loadedTeam) {
          fullTeam = loadedTeam;
        }
      }
      setTeam(fullTeam);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('teamId', teamData.id.toString());
      }
    } else {
      setLoginError('Invalid email or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdminMode(false);
    apiHelpers._adminMode = false;
    setTeam(null);
    setIdentifier('');
    setPassword('');
    setAdminViewTab('directory');
    setIsPreviewMode(false);
    setPreviousTeam(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('teamId');
    }
  };

  const saveSponsorLogo = async (logoUrl) => {
    if (!team?.id) return;
    const nextSubmissionData = { ...(team.submissionData || {}) };
    nextSubmissionData[30] = logoUrl;

    try {
      await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: team.id, sponsorLogo: logoUrl })
      });

      if (team.formSubmissionId) {
        await fetch('/api/submissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: team.formSubmissionId, data: nextSubmissionData })
        });
      }

      setTeam(prev => prev ? ({
        ...prev,
        sponsorLogo: logoUrl,
        submissionData: nextSubmissionData
      }) : prev);
      setSponsorLogoUrl(logoUrl);
      setSponsorLogoMessage('Sponsor logo updated.');
      setTimeout(() => setSponsorLogoMessage(''), 3000);
    } catch (error) {
      console.error('Error saving sponsor logo:', error);
      setSponsorLogoMessage('Failed to update sponsor logo.');
      setTimeout(() => setSponsorLogoMessage(''), 3000);
    }
  };

  const handleSponsorLogoUpload = async (file) => {
    if (!file || !team?.id) return;
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validImageTypes.includes(file.type)) {
      setSponsorLogoMessage('Please upload a valid image file (JPG, PNG, GIF, WebP, SVG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSponsorLogoMessage('Image must be less than 5MB.');
      return;
    }

    try {
      setSponsorLogoUploading(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      const response = await fetch('/api/upload-site-asset?type=sponsor-logo', {
        method: 'POST',
        body: uploadData
      });
      const data = await response.json();
      if (data?.success && data.url) {
        await saveSponsorLogo(data.url);
      } else {
        setSponsorLogoMessage(data?.error || 'Failed to upload sponsor logo.');
      }
    } catch (error) {
      console.error('Error uploading sponsor logo:', error);
      setSponsorLogoMessage('Failed to upload sponsor logo.');
    } finally {
      setSponsorLogoUploading(false);
    }
  };

  const saveKitDesignImage = async (imageUrl) => {
    if (!team?.id) return;
    const nextSubmissionData = { ...(team.submissionData || {}) };
    nextSubmissionData.kitDesignImageUrl = imageUrl;

    try {
      await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: team.id, submissionData: nextSubmissionData })
      });

      if (team.formSubmissionId) {
        await fetch('/api/submissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: team.formSubmissionId, data: nextSubmissionData })
        });
      }

      setTeam(prev => prev ? ({
        ...prev,
        submissionData: nextSubmissionData
      }) : prev);
      setKitDesignImageUrl(imageUrl);
      setKitDesignMessage('Kit design updated.');
      setTimeout(() => setKitDesignMessage(''), 3000);
    } catch (error) {
      console.error('Error saving kit design image:', error);
      setKitDesignMessage('Failed to update kit design.');
      setTimeout(() => setKitDesignMessage(''), 3000);
    }
  };

  const handleKitDesignUpload = async (file) => {
    if (!file || !team?.id) return;
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!validImageTypes.includes(file.type)) {
      setKitDesignMessage('Please upload a valid image file (JPG, PNG, GIF, WebP, SVG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setKitDesignMessage('Image must be less than 5MB.');
      return;
    }

    try {
      setKitDesignUploading(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      const response = await fetch('/api/upload-site-asset?type=team-kit', {
        method: 'POST',
        body: uploadData
      });
      const data = await response.json();
      if (data?.success && data.url) {
        await saveKitDesignImage(data.url);
      } else {
        setKitDesignMessage(data?.error || 'Failed to upload kit design.');
      }
    } catch (error) {
      console.error('Error uploading kit design image:', error);
      setKitDesignMessage('Failed to upload kit design.');
    } finally {
      setKitDesignUploading(false);
    }
  };

  // Age Group Team Management
  const saveAgeGroupTeams = async (updatedAgeGroups) => {
    if (!team?.id) return;
    setAgeGroupSaving(true);
    try {
      const nextSubmissionData = { ...(team.submissionData || {}) };
      nextSubmissionData['33'] = updatedAgeGroups;
      nextSubmissionData['32'] = updatedAgeGroups.length;

      // Update teams table
      await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: team.id,
          ageGroupTeams: updatedAgeGroups,
          numberOfTeams: updatedAgeGroups.length,
          submissionData: nextSubmissionData
        })
      });

      // Update form_submissions table
      const submissionId = team.formSubmissionId || team.formSubmissionUuid;
      if (submissionId) {
        await fetch('/api/submissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: submissionId, data: nextSubmissionData })
        });
      }

      // Refresh team from server
      const updatedTeam = await apiHelpers.getTeamById(team.id);
      if (updatedTeam) setTeam(updatedTeam);
      return true;
    } catch (error) {
      console.error('Error saving age group teams:', error);
      return false;
    } finally {
      setAgeGroupSaving(false);
    }
  };

  const handleAddAgeGroup = async () => {
    if (!newAgeGroup.teamName.trim() || !newAgeGroup.ageGroup || !newAgeGroup.gender) {
      setAgeGroupMessage('Please fill in all fields.');
      setTimeout(() => setAgeGroupMessage(''), 3000);
      return;
    }
    const currentTeams = team.submissionData?.[33] || team.ageGroupTeams || [];
    const updated = [...currentTeams, { ...newAgeGroup, teamName: newAgeGroup.teamName.trim() }];
    const success = await saveAgeGroupTeams(updated);
    if (success) {
      setNewAgeGroup({ teamName: '', ageGroup: '', gender: '' });
      setShowAddAgeGroup(false);
      setAgeGroupMessage('Age group team added successfully.');
    } else {
      setAgeGroupMessage('Failed to add age group team.');
    }
    setTimeout(() => setAgeGroupMessage(''), 3000);
  };

  const handleDeleteAgeGroup = async (index) => {
    const currentTeams = team.submissionData?.[33] || team.ageGroupTeams || [];
    const updated = currentTeams.filter((_, i) => i !== index);
    const success = await saveAgeGroupTeams(updated);
    if (success) {
      setAgeGroupMessage('Age group team removed successfully.');
    } else {
      setAgeGroupMessage('Failed to remove age group team.');
    }
    setDeleteAgeGroupConfirm(null);
    setTimeout(() => setAgeGroupMessage(''), 3000);
  };

  const handleTeamSwitch = async (teamId) => {
    setIsPreviewMode(false);
    const selectedTeam = allTeams.find(t => t.id === parseInt(teamId));
    if (selectedTeam) {
      setTeam(selectedTeam);
      setSelectedTeamId(selectedTeam.id);
      setActiveTab('dashboard');
      setRefreshKey(prev => prev + 1);
      setPreviousTeam(selectedTeam);
      setAdminViewTab('profile');
    }
  };

  const previewTeamData = {
    id: null,
    teamName: 'Preview Falcons Cricket Club',
    managerName: 'Jordan Moyo',
    managerPhone: '+27 82 555 0147',
    coachName: 'Ayesha Patel',
    email: 'preview@winterleaguecricket.co.za',
    phone: '+27 82 555 0147',
    status: 'approved',
    teamLogo: 'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=300&h=300&fit=crop',
    createdAt: new Date('2025-10-12T09:30:00').toISOString(),
    lastLogin: new Date('2026-01-24T18:05:00').toISOString(),
    submissionData: {
      33: [
        { teamName: 'U11 Boys', gender: 'Boys', ageGroup: 'U11' },
        { teamName: 'U13 Girls', gender: 'Girls', ageGroup: 'U13' },
        { teamName: 'U15 Boys', gender: 'Boys', ageGroup: 'U15' },
        { teamName: 'U19 Mixed', gender: 'Mixed', ageGroup: 'U19' }
      ],
      kitDesignId: 1
    },
    players: [
      { id: 101, name: 'Thabo Nkosi', roles: ['Batsman'], shirtNumber: 7, addedAt: '2025-12-18', subTeam: 'U11 Boys' },
      { id: 102, name: 'Liam Naidoo', roles: ['All-rounder'], shirtNumber: 12, addedAt: '2025-12-18', subTeam: 'U11 Boys' },
      { id: 103, name: 'Ethan Adams', roles: ['Bowler'], shirtNumber: 33, addedAt: '2025-12-19', subTeam: 'U11 Boys' },
      { id: 104, name: 'Kayden Smith', roles: ['Wicket-keeper'], shirtNumber: 1, addedAt: '2025-12-19', subTeam: 'U11 Boys' },
      { id: 105, name: 'Rafiq Osman', roles: ['Batsman'], shirtNumber: 18, addedAt: '2025-12-20', subTeam: 'U11 Boys' },
      { id: 106, name: 'Noah Daniels', roles: ['Bowler'], shirtNumber: 24, addedAt: '2025-12-20', subTeam: 'U11 Boys' },
      { id: 107, name: 'Mason Langa', roles: ['All-rounder'], shirtNumber: 5, addedAt: '2025-12-21', subTeam: 'U11 Boys' },
      { id: 108, name: 'Zayd Pillay', roles: ['Batsman'], shirtNumber: 22, addedAt: '2025-12-22', subTeam: 'U11 Boys' },

      { id: 201, name: 'Hannah Moeketsi', roles: ['Batsman'], shirtNumber: 9, addedAt: '2025-12-15', subTeam: 'U13 Girls' },
      { id: 202, name: 'Sana Jacobs', roles: ['All-rounder'], shirtNumber: 16, addedAt: '2025-12-16', subTeam: 'U13 Girls' },
      { id: 203, name: 'Naledi Khumalo', roles: ['Bowler'], shirtNumber: 4, addedAt: '2025-12-16', subTeam: 'U13 Girls' },
      { id: 204, name: 'Zoe Singh', roles: ['Wicket-keeper'], shirtNumber: 3, addedAt: '2025-12-17', subTeam: 'U13 Girls' },
      { id: 205, name: 'Amelia George', roles: ['Batsman'], shirtNumber: 20, addedAt: '2025-12-18', subTeam: 'U13 Girls' },
      { id: 206, name: 'Lerato Maseko', roles: ['Bowler'], shirtNumber: 11, addedAt: '2025-12-18', subTeam: 'U13 Girls' },
      { id: 207, name: 'Ivy Brown', roles: ['All-rounder'], shirtNumber: 14, addedAt: '2025-12-19', subTeam: 'U13 Girls' },
      { id: 208, name: 'Emma Williams', roles: ['Batsman'], shirtNumber: 27, addedAt: '2025-12-20', subTeam: 'U13 Girls' },

      { id: 301, name: 'Sizwe Mokoena', roles: ['Batsman'], shirtNumber: 10, addedAt: '2025-12-10', subTeam: 'U15 Boys' },
      { id: 302, name: 'Jason Carter', roles: ['Bowler'], shirtNumber: 2, addedAt: '2025-12-10', subTeam: 'U15 Boys' },
      { id: 303, name: 'Neo Molefe', roles: ['All-rounder'], shirtNumber: 6, addedAt: '2025-12-11', subTeam: 'U15 Boys' },
      { id: 304, name: 'Michael Khan', roles: ['Batsman'], shirtNumber: 15, addedAt: '2025-12-11', subTeam: 'U15 Boys' },
      { id: 305, name: 'Sahil Raj', roles: ['Bowler'], shirtNumber: 19, addedAt: '2025-12-12', subTeam: 'U15 Boys' },
      { id: 306, name: 'Jared Ndlovu', roles: ['All-rounder'], shirtNumber: 25, addedAt: '2025-12-12', subTeam: 'U15 Boys' },
      { id: 307, name: 'Owen Botha', roles: ['Wicket-keeper'], shirtNumber: 13, addedAt: '2025-12-13', subTeam: 'U15 Boys' },
      { id: 308, name: 'Caleb Zondo', roles: ['Batsman'], shirtNumber: 17, addedAt: '2025-12-13', subTeam: 'U15 Boys' },
      { id: 309, name: 'Ruben Dlamini', roles: ['Bowler'], shirtNumber: 8, addedAt: '2025-12-14', subTeam: 'U15 Boys' },
      { id: 310, name: 'Aiden Botha', roles: ['All-rounder'], shirtNumber: 21, addedAt: '2025-12-14', subTeam: 'U15 Boys' },

      { id: 401, name: 'Tariq Mthembu', roles: ['Batsman'], shirtNumber: 28, addedAt: '2025-12-08', subTeam: 'U19 Mixed' },
      { id: 402, name: 'Caitlin Hughes', roles: ['All-rounder'], shirtNumber: 30, addedAt: '2025-12-08', subTeam: 'U19 Mixed' },
      { id: 403, name: 'Luca Ferreira', roles: ['Bowler'], shirtNumber: 31, addedAt: '2025-12-09', subTeam: 'U19 Mixed' },
      { id: 404, name: 'Jasmine Smith', roles: ['Wicket-keeper'], shirtNumber: 32, addedAt: '2025-12-09', subTeam: 'U19 Mixed' },
      { id: 405, name: 'Ezra Jacobs', roles: ['Batsman'], shirtNumber: 29, addedAt: '2025-12-10', subTeam: 'U19 Mixed' },
      { id: 406, name: 'Mia Naidoo', roles: ['Bowler'], shirtNumber: 26, addedAt: '2025-12-10', subTeam: 'U19 Mixed' }
    ],
    revenue: [
      { id: 'rev-01', type: 'registration', description: 'Player registration markup', amount: 1250, date: '2025-12-15' },
      { id: 'rev-02', type: 'merchandise', description: 'Kit sales commission', amount: 460, date: '2025-12-22' },
      { id: 'rev-03', type: 'registration', description: 'Additional player registrations', amount: 980, date: '2026-01-05' }
    ],
    bankingDetails: {
      accountHolder: 'Preview Falcons CC',
      bankName: 'FNB (First National Bank)',
      accountNumber: '1234567890',
      branchCode: '250655',
      accountType: 'Cheque'
    },
    subTeams: []
  };

  const enterPreviewMode = () => {
    if (!isPreviewMode) {
      setPreviousTeam(team);
    }
    setIsPreviewMode(true);
    setTeam(previewTeamData);
    setRevenueData({ total: 2690, markup: 2230, commission: 460 });
    setPendingPayout({
      id: 'PP-1201',
      amount: 1450,
      status: 'pending',
      requestedAt: '2026-01-22T11:15:00'
    });
    setPayoutHistory([
      { id: 'PH-101', amount: 980, processedAt: '2025-12-12' },
      { id: 'PH-102', amount: 750, processedAt: '2025-11-28' }
    ]);
    setSelectedTeamId(null);
    setActiveTab('dashboard');
  };

  const exitPreviewMode = () => {
    if (isPreviewMode) {
      setIsPreviewMode(false);
      if (previousTeam) {
        setTeam(previousTeam);
        setSelectedTeamId(previousTeam.id || null);
      } else {
        setTeam(null);
        setSelectedTeamId(null);
      }
    }
  };

  const handleAdminTabChange = (tab) => {
    if (tab === 'profile' && !selectedTeamId && !previousTeam) return;
    setAdminViewTab(tab);
    if (tab === 'preview') {
      enterPreviewMode();
    } else {
      exitPreviewMode();
    }
  };

  const handleRefreshData = async () => {
    if (isPreviewMode) return;
    setIsRefreshing(true);
    
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (isAdminMode) {
      const teams = await apiHelpers.getAllTeams();
      setAllTeams(teams);
      if (team) {
        const updatedTeam = teams.find(t => t.id === team.id);
        if (updatedTeam) {
          setTeam(updatedTeam);
        }
      }
    } else {
      const updatedTeam = await apiHelpers.getTeamById(team.id);
      if (updatedTeam) {
        setTeam(updatedTeam);
      }
    }
    setRefreshKey(prev => prev + 1);
    setIsRefreshing(false);
  };

  const handleMovePlayer = async (playerId, currentSubTeam, newSubTeam) => {
    if (isPreviewMode) return;
    if (team?.id) {
      const success = await apiHelpers.movePlayer(team.id, playerId, newSubTeam);
      if (success) {
        const updatedTeam = await apiHelpers.getTeamById(team.id);
        setTeam(updatedTeam);
        setPlayerActionMenu(null);
      }
    }
  };

  const handleDuplicatePlayer = async (playerId, currentSubTeam, newSubTeam) => {
    if (isPreviewMode) return null;
    if (team?.id) {
      const duplicated = await apiHelpers.duplicatePlayer(team.id, playerId, newSubTeam);
      if (duplicated) {
        const updatedTeam = await apiHelpers.getTeamById(team.id);
        setTeam(updatedTeam);
        setPlayerActionMenu(null);
      }
    }
  };

  const handleUpdatePlayerRoles = async (playerId, newRoles) => {
    if (isPreviewMode) return;
    if (team?.id) {
      const success = await apiHelpers.updatePlayerRoles(team.id, playerId, newRoles);
      if (success) {
        const updatedTeam = await apiHelpers.getTeamById(team.id);
        setTeam(updatedTeam);
        setEditingPlayerRoles(null);
      }
    }
  };

  const handleRequestPayout = async () => {
    if (isPreviewMode) {
      setPayoutMessage('Preview mode: payouts are disabled.');
      return;
    }
    setPayoutMessage('');
    
    const revenueData = await apiHelpers.getRevenue(team.id);
    const breakdown = revenueData;
    
    console.log('Team ID:', team.id);
    console.log('Revenue breakdown:', breakdown);
    
    if (breakdown.total <= 0) {
      setPayoutMessage('No revenue available to request payout');
      setTimeout(() => setPayoutMessage(''), 3000);
      return;
    }
    
    const pendingRequest = await apiHelpers.getPendingPayout(team.id);
    console.log('Pending request check:', pendingRequest);
    
    if (pendingRequest) {
      setPayoutMessage('You already have a pending payout request');
      setTimeout(() => setPayoutMessage(''), 3000);
      return;
    }
    
    const request = await apiHelpers.createPayoutRequest(team.id);
    console.log('Created payout request:', request);
    
    if (request) {
      setPayoutMessage(`Payout request submitted successfully! Request ID: ${request.id}`);
      
      // Send email notification to admin
      try {
        const response = await fetch('/api/send-payout-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requestId: request.id,
            teamName: request.teamName,
            coachName: request.coachName,
            email: request.email,
            phone: request.phone,
            amount: request.amount,
            breakdown: request.breakdown,
            requestDate: request.requestedAt
          }),
        });
        
        const data = await response.json();
        console.log('Email notification response:', data);
        
        if (data.success) {
          setPayoutMessage(`Payout request submitted successfully! Request ID: ${request.id}. Admin has been notified.`);
        }
      } catch (error) {
        console.error('Error sending notification:', error);
        // Don't show error to user - request was still created successfully
      }
      
      setTimeout(() => setPayoutMessage(''), 5000);
    } else {
      setPayoutMessage('Failed to create payout request');
      setTimeout(() => setPayoutMessage(''), 3000);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters');
      return;
    }

    await apiHelpers.updatePassword(team.id, newPassword);
    setPasswordMessage('Password updated successfully!');
    setNewPassword('');
    setConfirmPassword('');
    setChangingPassword(false);
    setTimeout(() => setPasswordMessage(''), 3000);
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    await apiHelpers.updateEmail(team.id, editEmail);
    const updatedTeam = await apiHelpers.getTeamById(team.id);
    setTeam(updatedTeam);
    setPasswordMessage('Email updated successfully!');
    setTimeout(() => setPasswordMessage(''), 3000);
  };

  const handleUpdateBanking = async (e) => {
    e.preventDefault();
    const finalBankingDetails = {
      ...bankingDetails,
      bankName: bankingDetails.bankName === 'Other' ? bankingDetails.otherBankName : bankingDetails.bankName
    };
    await apiHelpers.updateBankingDetails(team.id, finalBankingDetails);
    const updatedTeam = await apiHelpers.getTeamById(team.id);
    setTeam(updatedTeam);
    setBankingMessage('Banking details saved successfully!');
    setTimeout(() => setBankingMessage(''), 3000);
  };

  const openRemovalModal = (player) => {
    setRemovalModal(player);
    setRemovalMessage('');
    setRemovalError('');
  };

  const submitRemovalRequest = async () => {
    if (!team?.id || !removalModal?.id) return;
    setRemovalSubmitting(true);
    setRemovalError('');
    const result = await apiHelpers.requestPlayerRemoval(team.id, removalModal.id, removalMessage);
    if (!result || result.error) {
      setRemovalError(result?.message || 'Failed to submit removal request. Please try again.');
      setRemovalSubmitting(false);
      return;
    }
    const requests = await apiHelpers.getRemovalRequests(team.id);
    setRemovalRequests(requests);
    setRemovalSubmitting(false);
    setRemovalModal(null);
    setRemovalMessage('');
  };

  const applyDashboardCardHover = (element, isHover) => {
    if (!element) return;
    const shine = element.querySelector('[data-card-shine="true"]');
    if (shine) {
      shine.style.left = isHover ? '140%' : '-120%';
    }
    if (isHover) {
      element.style.transform = 'translateY(-4px)';
      element.style.borderColor = 'rgba(239, 68, 68, 0.7)';
      element.style.boxShadow = '0 14px 32px rgba(220, 0, 0, 0.35), 0 0 22px rgba(255, 255, 255, 0.25)';
      element.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.98) 55%, rgba(220, 0, 0, 0.35) 100%)';
      element.style.filter = 'saturate(1.15) brightness(1.08)';
    } else {
      element.style.transform = 'translateY(0)';
      element.style.borderColor = 'rgba(255,255,255,0.08)';
      element.style.boxShadow = '0 1px 3px rgba(0,0,0,0.4)';
      element.style.background = '#111827';
      element.style.filter = 'none';
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR'
  }).format(Number(value || 0));
  const teamLogoUrl = team?.teamLogo || team?.submissionData?.teamLogo || team?.submissionData?.['22'] || team?.submissionData?.[22] || '';

  if (!isAuthenticated) {
    return (
      <>
        <Head>
          <title>Team Portal - Login</title>
        </Head>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #dc0000 100%)',
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '2.5rem',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            width: '100%',
            maxWidth: '450px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: '900',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '0.5rem'
              }}>
                🏏 WL Team Portal
              </h1>
              <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                Access your team dashboard
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: '#374151'
                }}>
                  Team Email
                </label>
                <input
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter team email address"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    color: '#111827',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '700',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  color: '#374151'
                }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    color: '#111827',
                    background: 'white',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#dc0000'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {loginError && (
                <div style={{
                  padding: '0.75rem',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Login to Portal
              </button>
            </form>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              background: '#f3f4f6',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#6b7280'
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
                First time logging in?
              </strong>
              <p style={{ margin: 0 }}>
                Use your team email and the temporary password sent to you after registration.
                You can change your password after logging in.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{team?.teamName ? `${team.teamName} - Team Portal` : 'Team Portal'}</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0b0b0b' }}>
        {/* Header */}
        <div
          className="teamPortalHeader"
          style={{
            background: `linear-gradient(135deg, ${portalTemplate.headerStart} 0%, ${portalTemplate.headerEnd} 100%)`,
            color: 'white',
            padding: '1rem 2rem',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)'
          }}
        >
          <div
            className="teamPortalHeaderInner"
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div className="teamPortalHeaderLeft" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="teamPortalHeaderText">
                <h1 className="teamPortalHeaderTitle" style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>
                  {portalTemplate.title} {team?.teamName ? `· ${team.teamName}` : ''}
                </h1>
                <p className="teamPortalHeaderSubtitle" style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
                  {portalTemplate.subtitle} {isAdminMode && <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Admin View</span>}
                </p>
              </div>
              {isPreviewMode && (
                <span style={{
                  background: 'rgba(255,255,255,0.25)',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  letterSpacing: '0.3px'
                }}>
                  Preview Mode
                </span>
              )}
              {isAdminMode && allTeams.length > 0 && (
                <select
                  value={selectedTeamId || ''}
                  onChange={(e) => handleTeamSwitch(e.target.value)}
                  className="teamPortalTeamSelect"
                  style={{
                    padding: '0.6rem 1rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    background: '#111827',
                    color: '#f9fafb',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    minWidth: '220px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                  }}
                >
                  <option value="">Select a team</option>
                  {allTeams.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.teamName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1.25rem',
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            >
              Logout
            </button>
          </div>
        </div>

        {isAdminMode && (
          <div style={{ maxWidth: '1400px', margin: '2rem auto' }}>
            <div style={{
              background: '#0b0b0b',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
              overflow: 'hidden',
              border: '1px solid rgba(220, 0, 0, 0.3)'
            }}>
              <div style={{
                padding: '1rem 1.75rem',
                background: '#0f0f0f',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {[
                    { key: 'directory', label: 'Directory' },
                    { key: 'preview', label: 'Preview' },
                    { key: 'profile', label: 'Selected Team' }
                  ].map((tab) => {
                    const isDisabled = tab.key === 'profile' && !selectedTeamId;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => handleAdminTabChange(tab.key)}
                        disabled={isDisabled}
                        style={{
                          padding: '0.55rem 1.2rem',
                          background: adminViewTab === tab.key ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' : 'rgba(255,255,255,0.08)',
                          color: adminViewTab === tab.key ? '#ffffff' : '#e5e7eb',
                          border: 'none',
                          borderRadius: '999px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.5 : 1
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {adminViewTab === 'directory' && (
                <>
                  <div style={{
                    margin: 0,
                    padding: '1.5rem 1.75rem',
                    background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                    color: '#ffffff',
                    fontWeight: '900',
                    fontSize: '1.4rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    Team Directory
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      color: '#ffffff',
                      marginLeft: '0.5rem',
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '0.3rem 0.85rem',
                      borderRadius: '999px',
                      whiteSpace: 'nowrap'
                    }}>
                      {allTeams.length} teams
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{
                            background: '#111827',
                            padding: '1.25rem',
                            textAlign: 'left',
                            fontWeight: '800',
                            color: '#ffffff',
                            borderBottom: '1px solid rgba(220, 0, 0, 0.4)',
                            textTransform: 'uppercase',
                            fontSize: '0.85rem',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap'
                          }}>Team</th>
                          <th style={{
                            background: '#111827',
                            padding: '1.25rem',
                            textAlign: 'left',
                            fontWeight: '800',
                            color: '#ffffff',
                            borderBottom: '1px solid rgba(220, 0, 0, 0.4)',
                            textTransform: 'uppercase',
                            fontSize: '0.85rem',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap'
                          }}>Manager</th>
                          <th style={{
                            background: '#111827',
                            padding: '1.25rem',
                            textAlign: 'left',
                            fontWeight: '800',
                            color: '#ffffff',
                            borderBottom: '1px solid rgba(220, 0, 0, 0.4)',
                            textTransform: 'uppercase',
                            fontSize: '0.85rem',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap'
                          }}>Email</th>
                          <th style={{
                            background: '#111827',
                            padding: '1.25rem',
                            textAlign: 'left',
                            fontWeight: '800',
                            color: '#ffffff',
                            borderBottom: '1px solid rgba(220, 0, 0, 0.4)',
                            textTransform: 'uppercase',
                            fontSize: '0.85rem',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap'
                          }}>Status</th>
                          <th style={{
                            background: '#111827',
                            padding: '1.25rem',
                            textAlign: 'left',
                            fontWeight: '800',
                            color: '#ffffff',
                            borderBottom: '1px solid rgba(220, 0, 0, 0.4)',
                            textTransform: 'uppercase',
                            fontSize: '0.85rem',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap'
                          }}>Players</th>
                          <th style={{
                            background: '#111827',
                            padding: '1.25rem',
                            textAlign: 'left',
                            fontWeight: '800',
                            color: '#ffffff',
                            borderBottom: '1px solid rgba(220, 0, 0, 0.4)',
                            textTransform: 'uppercase',
                            fontSize: '0.85rem',
                            letterSpacing: '0.5px',
                            whiteSpace: 'nowrap'
                          }}>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allTeams.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{
                              padding: '1.5rem',
                              color: '#9ca3af',
                              textAlign: 'center'
                            }}>
                              No teams registered yet.
                            </td>
                          </tr>
                        )}
                        {allTeams.map((teamRow) => (
                          <tr
                            key={teamRow.id}
                            onClick={() => handleTeamSwitch(teamRow.id)}
                            style={{
                              cursor: 'pointer',
                              background: selectedTeamId === teamRow.id ? 'rgba(220, 0, 0, 0.15)' : 'transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (selectedTeamId !== teamRow.id) e.currentTarget.style.background = 'rgba(220, 0, 0, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                              if (selectedTeamId !== teamRow.id) e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#f3f4f6', fontWeight: '700' }}>
                              {teamRow.teamName || 'Unnamed Team'}
                            </td>
                            <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af' }}>
                              {teamRow.managerName || '—'}
                            </td>
                            <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af' }}>
                              {teamRow.email || '—'}
                            </td>
                            <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af', textTransform: 'capitalize' }}>
                              {teamRow.status || 'pending'}
                            </td>
                            <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af' }}>
                              {teamRow.players ? teamRow.players.length : 0}
                            </td>
                            <td style={{ padding: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#9ca3af' }}>
                              {teamRow.createdAt ? new Date(teamRow.createdAt).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {team && (!isAdminMode || adminViewTab !== 'directory') && (
        <div
          className="teamPortalContent"
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '2rem'
          }}
        >
          <div
            className="teamPortalBanner"
            style={{
              background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(3, 7, 18, 0.95) 55%, rgba(220, 0, 0, 0.25) 100%)',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1.5rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
            }}
          >
            <div
              className="teamPortalLogoFrame"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(239, 68, 68, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 6px 18px rgba(239, 68, 68, 0.35)'
              }}
            >
              {teamLogoUrl ? (
                <img
                  src={teamLogoUrl}
                  alt={`${team?.teamName || 'Team'} logo`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '1.5rem' }}>🏏</span>
              )}
            </div>
            <div style={{ color: '#f9fafb' }}>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.12rem', color: 'rgba(255,255,255,0.6)' }}>
                Team Banner
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{team?.teamName || 'Team Portal'}</div>
            </div>
          </div>
          {/* Status Badge */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
                background: team.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 
                            team.status === 'approved' ? 'rgba(59, 130, 246, 0.15)' :
                            team.status === 'pending' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.2)',
                color: team.status === 'active' ? '#6ee7b7' :
                       team.status === 'approved' ? '#93c5fd' :
                       team.status === 'pending' ? '#fcd34d' : '#fca5a5',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              {team.status === 'active' && '✓'} 
              {team.status === 'approved' && '👍'} 
              {team.status === 'pending' && '⏳'} 
              {team.status === 'suspended' && '⚠️'} 
              {' '}{team.status}
            </span>
          </div>

          {activeTab !== 'dashboard' && (
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#f9fafb',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(220, 0, 0, 0.5)';
                  e.currentTarget.style.background = 'rgba(220, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                ← Back to Dashboard
              </button>
            </div>
          )}

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#f9fafb' }}>
                Team Dashboard
              </h2>

              <div
                className="teamDashboardGrid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="teamDashboardCard"
                  style={{
                    background: '#111827',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => applyDashboardCardHover(e.currentTarget, true)}
                  onMouseLeave={(e) => applyDashboardCardHover(e.currentTarget, false)}
                >
                  <span
                    data-card-shine="true"
                    style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-120%',
                      width: '60%',
                      height: '200%',
                      background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                      transform: 'skewX(-20deg)',
                      transition: 'left 0.5s ease',
                      pointerEvents: 'none'
                    }}
                  />
                  <div style={{
                    width: '48px',
                    height: '48px',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid rgba(239, 68, 68, 0.35)'
                  }}>
                    {portalIcons.profile}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                    Profile & Settings
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: '600' }}>
                    Team details, kit, banking
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('players')}
                  className="teamDashboardCard"
                  style={{
                    background: '#111827',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => applyDashboardCardHover(e.currentTarget, true)}
                  onMouseLeave={(e) => applyDashboardCardHover(e.currentTarget, false)}
                >
                  <span
                    data-card-shine="true"
                    style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-120%',
                      width: '60%',
                      height: '200%',
                      background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                      transform: 'skewX(-20deg)',
                      transition: 'left 0.5s ease',
                      pointerEvents: 'none'
                    }}
                  />
                  <div style={{
                    width: '48px',
                    height: '48px',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid rgba(239, 68, 68, 0.35)'
                  }}>
                    {portalIcons.players}
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#f9fafb' }}>
                    Player Management
                  </div>
                </button>


                <button
                  type="button"
                  onClick={() => setActiveTab('revenue')}
                  className="teamDashboardCard"
                  style={{
                    background: '#111827',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => applyDashboardCardHover(e.currentTarget, true)}
                  onMouseLeave={(e) => applyDashboardCardHover(e.currentTarget, false)}
                >
                  <span
                    data-card-shine="true"
                    style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-120%',
                      width: '60%',
                      height: '200%',
                      background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                      transform: 'skewX(-20deg)',
                      transition: 'left 0.5s ease',
                      pointerEvents: 'none'
                    }}
                  />
                  <div style={{
                    width: '48px',
                    height: '48px',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    color: '#f87171',
                    background: 'rgba(239, 68, 68, 0.14)',
                    border: '1px solid rgba(239, 68, 68, 0.35)'
                  }}>
                    {portalIcons.revenue}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#f9fafb', marginBottom: '0.25rem' }}>
                    {formatCurrency(revenueData?.total)}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af', fontWeight: '600' }}>
                    Revenue & Payouts
                  </div>
                </button>
              </div>

              {/* Recent Activity */}
              <div style={{
                background: '#111827',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#f9fafb' }}>
                  Team Information
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <strong style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Coach Name:</strong>
                    <div style={{ color: '#f9fafb', fontSize: '1rem', fontWeight: '600' }}>{team.coachName}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Email:</strong>
                    <div style={{ color: '#f9fafb', fontSize: '1rem', fontWeight: '600' }}>{team.email}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Phone:</strong>
                    <div style={{ color: '#f9fafb', fontSize: '1rem', fontWeight: '600' }}>{team.phone}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Registration Date:</strong>
                    <div style={{ color: '#f9fafb', fontSize: '1rem', fontWeight: '600' }}>
                      {new Date(team.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {team.lastLogin && (
                    <div>
                      <strong style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Last Login:</strong>
                      <div style={{ color: '#f9fafb', fontSize: '1rem', fontWeight: '600' }}>
                        {new Date(team.lastLogin).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#f9fafb' }}>
                Team Players
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                <button
                  type="button"
                  onClick={() => setPlayersView('roster')}
                  style={{
                    padding: '1rem 1.1rem',
                    background: playersView === 'roster' ? '#111827' : '#0f172a',
                    color: '#ffffff',
                    border: playersView === 'roster' ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  Team Players
                </button>
                <button
                  type="button"
                  onClick={() => setPlayersView('removals')}
                  style={{
                    padding: '1rem 1.1rem',
                    background: playersView === 'removals' ? '#111827' : '#0f172a',
                    color: '#ffffff',
                    border: playersView === 'removals' ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  Remove Players
                </button>
              </div>

              {playersView === 'roster' && (
                <div style={{
                  background: '#111827',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  {team.players?.length > 0 ? (
                (() => {
                  // Group players by sub-team
                  const subTeams = team.submissionData?.[33] || [];
                  const playersGrouped = {};
                  
                  // Build composite key for each sub-team: "TeamName (Gender - AgeGroup)"
                  const buildKey = (st) => {
                    const name = (st.teamName || '').trim();
                    const gender = (st.gender || '').trim();
                    const age = (st.ageGroup || '').trim();
                    if (name && gender && age) return `${name} (${gender} - ${age})`;
                    if (name && age) return `${name} (${age})`;
                    return name || age || gender || 'Ungrouped';
                  };
                  
                  // Initialize groups for each sub-team with composite key
                  subTeams.forEach(subTeam => {
                    const key = buildKey(subTeam);
                    playersGrouped[key] = {
                      info: subTeam,
                      players: []
                    };
                  });
                  
                  // Add ungrouped category for players without sub-team assignment
                  playersGrouped['Ungrouped'] = {
                    info: { teamName: 'Ungrouped', gender: '', ageGroup: '' },
                    players: []
                  };
                  
                  // Group players — match by composite key, or try legacy teamName match
                  team.players.forEach(player => {
                    const st = (player.subTeam || '').trim();
                    if (!st) {
                      playersGrouped['Ungrouped'].players.push(player);
                    } else if (playersGrouped[st]) {
                      // Direct match (new composite format)
                      playersGrouped[st].players.push(player);
                    } else {
                      // Legacy fallback: player.subTeam is just the teamName, find matching group
                      const matchedKey = Object.keys(playersGrouped).find(key => {
                        const info = playersGrouped[key].info;
                        return info && (info.teamName || '').trim() === st;
                      });
                      if (matchedKey && matchedKey !== 'Ungrouped') {
                        playersGrouped[matchedKey].players.push(player);
                      } else {
                        playersGrouped['Ungrouped'].players.push(player);
                      }
                    }
                  });
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {Object.entries(playersGrouped).map(([subTeamName, group]) => {
                        if (group.players.length === 0) return null;
                        
                        return (
                          <div key={subTeamName} style={{
                            background: '#111827',
                            borderRadius: '12px',
                            border: '2px solid rgba(255,255,255,0.08)',
                            overflow: 'hidden'
                          }}>
                            {/* Sub-team header */}
                            <div style={{
                              background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)',
                              padding: '1rem 1.5rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div>
                                <h3 style={{ 
                                  fontSize: '1.15rem', 
                                  fontWeight: '700', 
                                  color: 'white',
                                  margin: 0,
                                  marginBottom: '0.25rem'
                                }}>
                                  {group.info.teamName || subTeamName}
                                </h3>
                                {group.info.gender && group.info.ageGroup && (
                                  <div style={{ 
                                    fontSize: '0.85rem', 
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    display: 'flex',
                                    gap: '1rem'
                                  }}>
                                    <span>👤 {group.info.gender}</span>
                                    <span>📋 {group.info.ageGroup}</span>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                  background: 'rgba(255, 255, 255, 0.2)',
                                  padding: '0.5rem 1rem',
                                  borderRadius: '8px',
                                  fontSize: '0.9rem',
                                  fontWeight: '700',
                                  color: 'white'
                                }}>
                                  {group.players.length} {group.players.length === 1 ? 'Player' : 'Players'}
                                </div>
                                {group.players.length < 15 && (
                                  <div style={{
                                    background: '#fbbf24',
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    color: '#78350f',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}>
                                    ⚠️ {15 - group.players.length} more needed
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Warning alert if less than 15 players */}
                            {group.players.length < 15 && (
                              <div style={{
                                background: 'linear-gradient(135deg, rgba(127, 29, 29, 0.45) 0%, rgba(76, 5, 25, 0.55) 100%)',
                                borderLeft: '4px solid #f87171',
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                              }}>
                                <div style={{ 
                                  fontSize: '1.25rem',
                                  lineHeight: 1
                                }}>⚠️</div>
                                <div style={{ flex: 1 }}>
                                  <span style={{ 
                                    fontSize: '0.85rem', 
                                    fontWeight: '600', 
                                    color: '#fee2e2'
                                  }}>
                                    Minimum 15 players required •
                                  </span>
                                  <span style={{ 
                                    fontSize: '0.85rem', 
                                    color: '#fecaca',
                                    marginLeft: '0.5rem'
                                  }}>
                                    Currently <strong>{group.players.length}</strong> registered • <strong>{15 - group.players.length} more</strong> needed
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Players table */}
                            <div className="playersTableWrap">
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#0f172a' }}>
                                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>
                                    #
                                  </th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>
                                    Name
                                  </th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>
                                    Roles
                                  </th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>
                                    Shirt No.
                                  </th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>
                                    Joined
                                  </th>
                                  {(isAdminMode || isAuthenticated) && (
                                    <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>
                                      Actions
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {group.players.map((player, index) => (
                                  <tr key={player.id} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                                    <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', color: '#94a3b8' }}>
                                      {index + 1}
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.95rem', color: '#f9fafb', fontWeight: '600' }}>
                                      {player.name || player.playerName || '-'}
                                      {isAdminMode && player.paymentStatus === 'pending_payment' && (
                                        <span style={{ marginLeft: '0.5rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '500' }}>
                                          ⚠ Unpaid
                                        </span>
                                      )}
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#e2e8f0' }}>
                                      {player.roles || player.registrationData?.roles ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                          {(Array.isArray(player.roles || player.registrationData?.roles)
                                            ? (player.roles || player.registrationData?.roles)
                                            : [player.roles || player.registrationData?.roles]
                                          ).map((role, idx) => (
                                            <span key={idx} style={{
                                              display: 'inline-block',
                                              background: 'rgba(59, 130, 246, 0.2)',
                                              color: '#bfdbfe',
                                              border: '1px solid rgba(59, 130, 246, 0.35)',
                                              padding: '0.2rem 0.5rem',
                                              borderRadius: '4px',
                                              fontSize: '0.75rem',
                                              fontWeight: '600'
                                            }}>
                                              {role}
                                            </span>
                                          ))}
                                        </div>
                                      ) : '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
                                      <span style={{
                                        display: 'inline-block',
                                        background: '#1f2937',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        color: '#f9fafb',
                                        border: '1px solid rgba(255,255,255,0.08)'
                                      }}>
                                        #{player.shirtNumber || player.jerseyNumber || '-'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                                      {player.addedAt || player.createdAt ? new Date(player.addedAt || player.createdAt).toLocaleDateString() : '—'}
                                    </td>
                                    {(isAdminMode || isAuthenticated) && (
                                      <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
                                        {playerActionMenu?.playerId === player.id ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.25rem' }}>MOVE TO:</div>
                                            {Object.keys(playersGrouped)
                                              .filter(name => name !== subTeamName && name !== 'Ungrouped')
                                              .map(targetSubTeam => (
                                                <button
                                                  key={`move-${targetSubTeam}`}
                                                  onClick={() => handleMovePlayer(player.id, subTeamName, targetSubTeam)}
                                                  style={{
                                                    padding: '0.4rem 0.6rem',
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap'
                                                  }}
                                                  onMouseOver={(e) => e.target.style.background = '#2563eb'}
                                                  onMouseOut={(e) => e.target.style.background = '#3b82f6'}
                                                >
                                                  ➜ {targetSubTeam}
                                                </button>
                                              ))}
                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', marginTop: '0.5rem', marginBottom: '0.25rem' }}>COPY TO:</div>
                                            {Object.keys(playersGrouped)
                                              .filter(name => name !== 'Ungrouped')
                                              .map(targetSubTeam => (
                                                <button
                                                  key={`duplicate-${targetSubTeam}`}
                                                  onClick={() => handleDuplicatePlayer(player.id, subTeamName, targetSubTeam)}
                                                  style={{
                                                    padding: '0.4rem 0.6rem',
                                                    background: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap'
                                                  }}
                                                  onMouseOver={(e) => e.target.style.background = '#059669'}
                                                  onMouseOut={(e) => e.target.style.background = '#10b981'}
                                                >
                                                  ⊕ {targetSubTeam}
                                                </button>
                                              ))}
                                            <button
                                              onClick={() => setPlayerActionMenu(null)}
                                              style={{
                                                padding: '0.4rem 0.6rem',
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                marginTop: '0.5rem'
                                              }}
                                              onMouseOver={(e) => e.target.style.background = '#dc2626'}
                                              onMouseOut={(e) => e.target.style.background = '#ef4444'}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        ) : (
                                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                            {isAdminMode && (
                                              <button
                                                onClick={() => setPlayerActionMenu({ playerId: player.id, subTeamName })}
                                                style={{
                                                  background: '#dc0000',
                                                  color: 'white',
                                                  border: 'none',
                                                  padding: '0.4rem 0.75rem',
                                                  borderRadius: '6px',
                                                  fontSize: '0.75rem',
                                                  fontWeight: '600',
                                                  cursor: 'pointer'
                                                }}
                                                onMouseOver={(e) => e.target.style.background = '#b30000'}
                                                onMouseOut={(e) => e.target.style.background = '#dc0000'}
                                              >
                                                Move/Copy
                                              </button>
                                            )}
                                            <button
                                              onClick={() => setEditingPlayerRoles({
                                                playerId: player.id,
                                                roles: player.roles || player.registrationData?.roles || []
                                              })}
                                              style={{
                                                background: '#6b7280',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.4rem 0.75rem',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                              }}
                                              onMouseOver={(e) => e.target.style.background = '#4b5563'}
                                              onMouseOut={(e) => e.target.style.background = '#6b7280'}
                                            >
                                              Edit Roles
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div style={{
                  background: '#0b0b0b',
                  padding: '3rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#f9fafb' }}>
                    No Players Registered Yet
                  </p>
                  <p style={{ fontSize: '0.9rem' }}>
                    Your player roster will appear here once parents complete the player registration form.
                  </p>
                </div>
              )}
                </div>
              )}

              {playersView === 'removals' && (
                <div style={{
                  background: '#111827',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <h3 style={{ margin: 0, marginBottom: '0.75rem', color: '#f9fafb' }}>Removal Requests</h3>
                  <p style={{ marginTop: 0, marginBottom: '1.5rem', color: '#9ca3af', fontSize: '0.9rem' }}>
                    Submit a request to remove a player. Admin approval is required.
                  </p>
                  {(() => {
                    const latestRequests = removalRequests.reduce((acc, req) => {
                      if (!acc[req.playerId] || new Date(req.createdAt) > new Date(acc[req.playerId].createdAt)) {
                        acc[req.playerId] = req;
                      }
                      return acc;
                    }, {});

                    return (
                      <div className="playersTableWrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#0f172a' }}>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>Player</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>Sub-team</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>Status</th>
                              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: '700', color: '#cbd5f5' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(team.players || []).map((player) => {
                              const request = latestRequests[player.id];
                              const status = request?.status || 'none';
                              const statusColor = status === 'approved' ? '#10b981' : status === 'rejected' ? '#f87171' : '#fbbf24';

                              return (
                                <tr key={player.id} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                  <td style={{ padding: '0.75rem 1rem', color: '#f9fafb', fontWeight: '600' }}>
                                    {player.name || player.playerName}
                                    {isAdminMode && player.paymentStatus === 'pending_payment' && (
                                      <span style={{ marginLeft: '0.5rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '500' }}>
                                        ⚠ Unpaid
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>{player.subTeam || '—'}</td>
                                  <td style={{ padding: '0.75rem 1rem', color: status === 'none' ? '#9ca3af' : statusColor, fontWeight: '700', textTransform: 'capitalize' }}>
                                    {status === 'none' ? 'No request' : status}
                                  </td>
                                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      onClick={() => openRemovalModal(player)}
                                      disabled={status === 'pending'}
                                      style={{
                                        padding: '0.4rem 0.75rem',
                                        background: status === 'pending' ? '#334155' : '#dc0000',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        cursor: status === 'pending' ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      {status === 'pending' ? 'Pending' : 'Request Removal'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Revenue Tab */}
          {activeTab === 'revenue' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#f9fafb' }}>
                  Team Revenue
                </h2>
                <button
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  style={{
                    padding: '0.5rem 1rem',
                    background: isRefreshing 
                      ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: isRefreshing ? 'wait' : 'pointer',
                    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
                    transition: 'transform 0.2s',
                    opacity: isRefreshing ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isRefreshing) e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
                </button>
              </div>

              {(() => {
                const revenue = team.revenue || [];
                const breakdown = revenueData;

                return (
                  <>
                    {/* Revenue Summary Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '1.5rem',
                      marginBottom: '2rem'
                    }}>
                      <div
                        className="teamDashboardCard"
                        style={{
                          background: '#111827',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => applyDashboardCardHover(e.currentTarget, true)}
                        onMouseLeave={(e) => applyDashboardCardHover(e.currentTarget, false)}
                      >
                        <span
                          data-card-shine="true"
                          style={{
                            position: 'absolute',
                            top: '-50%',
                            left: '-120%',
                            width: '60%',
                            height: '200%',
                            background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                            transform: 'skewX(-20deg)',
                            transition: 'left 0.5s ease',
                            pointerEvents: 'none'
                          }}
                        />
                        <div style={{
                          width: '48px',
                          height: '48px',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          color: '#34d399',
                          background: 'rgba(52, 211, 153, 0.14)',
                          border: '1px solid rgba(52, 211, 153, 0.35)'
                        }}>
                          {portalIcons.revenue}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: '600' }}>
                          Player Registration Markup
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: '#f9fafb' }}>
                          R{(breakdown.markup || 0).toFixed(2)}
                        </div>
                      </div>

                      <div
                        className="teamDashboardCard"
                        style={{
                          background: '#111827',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => applyDashboardCardHover(e.currentTarget, true)}
                        onMouseLeave={(e) => applyDashboardCardHover(e.currentTarget, false)}
                      >
                        <span
                          data-card-shine="true"
                          style={{
                            position: 'absolute',
                            top: '-50%',
                            left: '-120%',
                            width: '60%',
                            height: '200%',
                            background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                            transform: 'skewX(-20deg)',
                            transition: 'left 0.5s ease',
                            pointerEvents: 'none'
                          }}
                        />
                        <div style={{
                          width: '48px',
                          height: '48px',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          color: '#60a5fa',
                          background: 'rgba(96, 165, 250, 0.14)',
                          border: '1px solid rgba(96, 165, 250, 0.35)'
                        }}>
                          {portalIcons.revenue}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: '600' }}>
                          Product Commission (10%)
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: '#f9fafb' }}>
                          R{(breakdown.commission || 0).toFixed(2)}
                        </div>
                      </div>

                      <div
                        className="teamDashboardCard"
                        style={{
                          background: '#111827',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => applyDashboardCardHover(e.currentTarget, true)}
                        onMouseLeave={(e) => applyDashboardCardHover(e.currentTarget, false)}
                      >
                        <span
                          data-card-shine="true"
                          style={{
                            position: 'absolute',
                            top: '-50%',
                            left: '-120%',
                            width: '60%',
                            height: '200%',
                            background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                            transform: 'skewX(-20deg)',
                            transition: 'left 0.5s ease',
                            pointerEvents: 'none'
                          }}
                        />
                        <div style={{
                          width: '48px',
                          height: '48px',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '12px',
                          color: '#f87171',
                          background: 'rgba(239, 68, 68, 0.14)',
                          border: '1px solid rgba(239, 68, 68, 0.35)'
                        }}>
                          {portalIcons.revenue}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: '600' }}>
                          Total Revenue
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: '#f9fafb' }}>
                          R{(breakdown.total || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Pending Revenue Warning */}
                    {(breakdown.pendingCount > 0) && (
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '10px',
                        padding: '1rem 1.25rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}>
                        <span style={{ fontSize: '1.3rem' }}>⏳</span>
                        <div>
                          <div style={{ color: '#fbbf24', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.15rem' }}>
                            Pending Revenue: R{(breakdown.pendingTotal || 0).toFixed(2)}
                          </div>
                          <div style={{ color: '#d4a574', fontSize: '0.8rem' }}>
                            {breakdown.pendingCount} player registration{breakdown.pendingCount !== 1 ? 's' : ''} awaiting payment. Revenue will be added once parents complete checkout.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payout Request Section */}
                    <div style={{
                      background: '#0f172a',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      marginBottom: '2rem',
                      boxShadow: '0 12px 24px rgba(2, 6, 23, 0.45)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f9fafb', fontWeight: '700', marginBottom: '0.25rem' }}>
                            Request Payout
                          </h3>
                          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>
                            Submit a payout request for your accumulated revenue
                          </p>
                        </div>
                        <button
                          onClick={handleRequestPayout}
                          disabled={(breakdown.total || 0) <= 0 || pendingPayout}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: (breakdown.total || 0) <= 0 || pendingPayout 
                              ? 'rgba(148, 163, 184, 0.2)'
                              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: (breakdown.total || 0) <= 0 || pendingPayout ? '#94a3b8' : 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            cursor: (breakdown.total || 0) <= 0 || pendingPayout ? 'not-allowed' : 'pointer',
                            boxShadow: (breakdown.total || 0) <= 0 || pendingPayout 
                              ? 'none' 
                              : '0 4px 12px rgba(16, 185, 129, 0.3)',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if ((breakdown.total || 0) > 0 && !pendingPayout) {
                              e.target.style.transform = 'translateY(-2px)';
                            }
                          }}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          💸 Request Payout
                        </button>
                      </div>
                      
                      {payoutMessage && (
                        <div style={{
                          padding: '0.75rem 1rem',
                          background: payoutMessage.includes('successfully') ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                          border: payoutMessage.includes('successfully') ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(239, 68, 68, 0.5)',
                          borderRadius: '6px',
                          color: payoutMessage.includes('successfully') ? '#d1fae5' : '#fee2e2',
                          fontSize: '0.85rem',
                          marginTop: '1rem'
                        }}>
                          {payoutMessage}
                        </div>
                      )}
                      
                      {pendingPayout && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          background: 'rgba(245, 158, 11, 0.12)',
                          border: '1px solid rgba(245, 158, 11, 0.5)',
                          borderRadius: '8px'
                        }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fbbf24', marginBottom: '0.5rem' }}>
                            ⏳ Pending Payout Request
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#fde68a' }}>
                            Request ID: {pendingPayout.id} • Amount: R{(pendingPayout.amount || 0).toFixed(2)}<br />
                            Requested: {new Date(pendingPayout.requestedAt || pendingPayout.requested_at).toLocaleString()}<br />
                            Status: <strong style={{ textTransform: 'uppercase' }}>{pendingPayout.status}</strong>
                          </div>
                        </div>
                      )}
                      
                      {payoutHistory.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#e5e7eb', marginBottom: '0.75rem' }}>
                            Payout History
                          </h4>
                          {payoutHistory.slice(0, 3).map(payout => (
                            <div
                              key={payout.id}
                              style={{
                                padding: '0.75rem',
                                background: '#0b1220',
                                border: '1px solid rgba(148, 163, 184, 0.16)',
                                borderRadius: '6px',
                                marginBottom: '0.5rem',
                                fontSize: '0.8rem',
                                color: '#cbd5f5'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span>Request #{payout.id}</span>
                                <span style={{ fontWeight: '700', color: '#34d399' }}>R{(payout.amount || 0).toFixed(2)}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Paid: {new Date(payout.processedAt || payout.processed_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Revenue Breakdown Info */}
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.45)',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      marginBottom: '2rem'
                    }}>
                      <h3 style={{ 
                        fontSize: '0.95rem', 
                        marginBottom: '0.75rem', 
                        color: '#bfdbfe', 
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        💡 Revenue Sources
                      </h3>
                      <ul style={{ 
                        fontSize: '0.85rem', 
                        color: '#bfdbfe', 
                        margin: 0,
                        paddingLeft: '1.5rem',
                        lineHeight: '1.8'
                      }}>
                        <li><strong>Player Registration Markup:</strong> Your team earns the markup amount set per player registration (cost + markup = final price)</li>
                        <li><strong>Product Commission:</strong> 10% commission on all product sales made by customers linked to your team</li>
                      </ul>
                    </div>

                    {/* Revenue Details List */}
                    {revenue.length > 0 ? (
                      <div style={{
                        background: '#0f172a',
                        borderRadius: '12px',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        overflow: 'hidden',
                        boxShadow: '0 12px 24px rgba(2, 6, 23, 0.5)'
                      }}>
                        <div style={{
                          background: '#111827',
                          padding: '1rem 1.5rem',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
                        }}>
                          <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f9fafb', fontWeight: '700' }}>
                            Revenue Details
                          </h3>
                        </div>
                        <div style={{ padding: '1rem' }}>
                          {revenue.sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => (
                            <div
                              key={entry.id}
                              style={{
                                padding: '1.25rem',
                                marginBottom: '0.75rem',
                                background: entry.type === 'player-registration-markup'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(59, 130, 246, 0.12)',
                                border: entry.type === 'player-registration-markup'
                                  ? '1px solid rgba(16, 185, 129, 0.5)'
                                  : '1px solid rgba(59, 130, 246, 0.5)',
                                borderRadius: '10px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#f9fafb', marginBottom: '0.25rem' }}>
                                    {entry.type === 'player-registration-markup' ? (
                                      <>🏏 Player Registration - {entry.playerName}</>
                                    ) : (
                                      <>🛍️ Product Commission - {entry.customerName}</>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {new Date(entry.date).toLocaleString()}
                                  </div>
                                </div>
                                <div style={{
                                  fontSize: '1.25rem',
                                  fontWeight: '900',
                                  color: entry.type === 'player-registration-markup' ? '#34d399' : '#60a5fa'
                                }}>
                                  +R{entry.amount.toFixed(2)}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#cbd5f5', marginTop: '0.5rem' }}>
                                {entry.details}
                              </div>
                              {entry.orderNumber && (
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#94a3b8', 
                                  marginTop: '0.5rem',
                                  padding: '0.35rem 0.65rem',
                                  background: '#0b1220',
                                  borderRadius: '4px',
                                  display: 'inline-block'
                                }}>
                                  Order: {entry.orderNumber}
                                </div>
                              )}
                              {entry.submissionId && (
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#94a3b8', 
                                  marginTop: '0.5rem',
                                  padding: '0.35rem 0.65rem',
                                  background: '#0b1220',
                                  borderRadius: '4px',
                                  display: 'inline-block'
                                }}>
                                  Submission ID: {entry.submissionId}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        background: '#0f172a',
                        padding: '3rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        textAlign: 'center',
                        color: '#94a3b8'
                      }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          margin: '0 auto 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '16px',
                          color: '#60a5fa',
                          background: 'rgba(96, 165, 250, 0.14)',
                          border: '1px solid rgba(96, 165, 250, 0.35)'
                        }}>
                          {portalIcons.revenue}
                        </div>
                        <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#f9fafb' }}>
                          No Revenue Yet
                        </p>
                        <p style={{ fontSize: '0.9rem' }}>
                          Revenue from player registrations and product commissions will appear here.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#111827' }}>
                Profile & Settings
              </h2>

              {/* Profile Sub-Tabs */}
              <div
                className="profileCardGrid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}
              >
                {['details', 'kit', 'settings', 'banking'].map((tab) => {
                  const tabConfig = {
                    details: {
                      label: 'Team Details',
                      description: 'View team profile information',
                      icon: portalIcons.details,
                      accent: '#60a5fa',
                      accentBg: 'rgba(96, 165, 250, 0.14)',
                      accentBorder: '1px solid rgba(96, 165, 250, 0.35)'
                    },
                    kit: {
                      label: 'Kit Design',
                      description: 'Your approved kit design',
                      icon: portalIcons.kit,
                      accent: '#f87171',
                      accentBg: 'rgba(239, 68, 68, 0.14)',
                      accentBorder: '1px solid rgba(239, 68, 68, 0.35)'
                    },
                    settings: {
                      label: 'Profile Settings',
                      description: 'Update email and password',
                      icon: portalIcons.settings,
                      accent: '#fbbf24',
                      accentBg: 'rgba(251, 191, 36, 0.14)',
                      accentBorder: '1px solid rgba(251, 191, 36, 0.35)'
                    },
                    banking: {
                      label: 'Banking Details',
                      description: 'Payout account details',
                      icon: portalIcons.banking,
                      accent: '#34d399',
                      accentBg: 'rgba(52, 211, 153, 0.14)',
                      accentBorder: '1px solid rgba(52, 211, 153, 0.35)'
                    }
                  }[tab];

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setProfileTab(tab)}
                      className="teamDashboardCard"
                      style={{
                        background: '#111827',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: profileTab === tab
                          ? '1px solid rgba(248, 113, 113, 0.7)'
                          : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: profileTab === tab
                          ? '0 12px 24px rgba(220, 0, 0, 0.25)'
                          : '0 1px 3px rgba(0,0,0,0.4)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => applyDashboardCardHover(e.currentTarget, true)}
                      onMouseLeave={(e) => applyDashboardCardHover(e.currentTarget, false)}
                    >
                      <span
                        data-card-shine="true"
                        style={{
                          position: 'absolute',
                          top: '-50%',
                          left: '-120%',
                          width: '60%',
                          height: '200%',
                          background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                          transform: 'skewX(-20deg)',
                          transition: 'left 0.5s ease',
                          pointerEvents: 'none'
                        }}
                      />
                      <div style={{
                        width: '48px',
                        height: '48px',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '12px',
                        color: tabConfig.accent,
                        background: tabConfig.accentBg,
                        border: tabConfig.accentBorder
                      }}>
                        {tabConfig.icon}
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f9fafb', marginBottom: '0.25rem' }}>
                        {tabConfig.label}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: '600' }}>
                        {tabConfig.description}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Team Details Sub-Tab */}
              {profileTab === 'details' && (
                <div style={{
                  background: '#111827',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#f9fafb' }}>
                    Team Information
                  </h3>
                  <div
                    className="profileInfoGrid"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Team Name
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#f9fafb'
                      }}>
                        {team.teamName}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Team Manager
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#f9fafb'
                      }}>
                        {team.managerName}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Manager Contact
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#f9fafb'
                      }}>
                        {team.managerPhone}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Email
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#f9fafb'
                      }}>
                        {team.email}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Sponsor Logo
                      </label>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          handleSponsorLogoUpload(file);
                        }}
                        style={{
                          border: '2px dashed rgba(255,255,255,0.15)',
                          borderRadius: '10px',
                          padding: '1rem',
                          background: 'rgba(255,255,255,0.05)',
                          textAlign: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          const input = document.getElementById('sponsor-logo-upload');
                          if (input) input.click();
                        }}
                      >
                        {sponsorLogoUrl ? (
                          <img
                            src={sponsorLogoUrl}
                            alt="Sponsor logo"
                            style={{ maxWidth: '100%', maxHeight: '140px', objectFit: 'contain' }}
                          />
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                            Drag & drop sponsor logo here, or click to upload
                          </div>
                        )}
                      </div>
                      <input
                        id="sponsor-logo-upload"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleSponsorLogoUpload(e.target.files?.[0])}
                      />
                      {sponsorLogoUploading && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>Uploading...</div>
                      )}
                      {sponsorLogoMessage && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#f9fafb' }}>{sponsorLogoMessage}</div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Status
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#f9fafb',
                        textTransform: 'capitalize'
                      }}>
                        {team.status}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        Registered
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#f9fafb'
                      }}>
                        {new Date(team.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#93c5fd'
                  }}>
                    <strong>📝 Note:</strong> To update team name, manager name, or contact number, please contact the league administrator.
                  </div>

                  {/* Sub-Teams Section */}
                  <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🏆</span> Age Group Teams ({(team.submissionData?.[33] || team.ageGroupTeams || []).length})
                    </h3>

                    {/* Feedback message */}
                    {ageGroupMessage && (
                      <div style={{
                        marginBottom: '1rem',
                        padding: '0.6rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        background: ageGroupMessage.includes('Failed') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: ageGroupMessage.includes('Failed') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        color: ageGroupMessage.includes('Failed') ? '#fca5a5' : '#6ee7b7'
                      }}>
                        {ageGroupMessage}
                      </div>
                    )}

                    {(team.submissionData?.[33] || team.ageGroupTeams || []).length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {(team.submissionData?.[33] || team.ageGroupTeams || []).map((subTeam, index) => (
                          <div
                            key={index}
                            className="teamDashboardCard"
                            style={{
                              background: '#111827',
                              padding: '1.5rem',
                              borderRadius: '12px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                              textAlign: 'left',
                              transition: 'all 0.2s',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => applyDashboardCardHover(e.currentTarget, true)}
                            onMouseLeave={(e) => applyDashboardCardHover(e.currentTarget, false)}
                          >
                            <span
                              data-card-shine="true"
                              style={{
                                position: 'absolute',
                                top: '-50%',
                                left: '-120%',
                                width: '60%',
                                height: '200%',
                                background: 'linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.45), transparent)',
                                transform: 'skewX(-20deg)',
                                transition: 'left 0.5s ease',
                                pointerEvents: 'none'
                              }}
                            />
                            {/* Delete button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteAgeGroupConfirm(index); }}
                              disabled={ageGroupSaving}
                              title="Remove age group team"
                              style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                transition: 'all 0.2s',
                                zIndex: 2,
                                opacity: ageGroupSaving ? 0.4 : 0.7
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.35)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                              </svg>
                            </button>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              marginBottom: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              color: '#f87171',
                              background: 'rgba(239, 68, 68, 0.14)',
                              border: '2px solid rgba(239, 68, 68, 0.45)',
                              overflow: 'hidden'
                            }}>
                              {teamLogoUrl ? (
                                <img src={teamLogoUrl} alt="Team logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : portalIcons.players}
                            </div>
                            <div style={{
                              fontSize: '1.05rem',
                              fontWeight: '800',
                              color: '#f9fafb',
                              marginBottom: '0.75rem',
                              paddingBottom: '0.75rem',
                              borderBottom: '1px solid rgba(148, 163, 184, 0.25)'
                            }}>
                              {subTeam.teamName}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: '#94a3b8', fontWeight: '600' }}>Gender:</span>
                                <span style={{ color: '#f9fafb', fontWeight: '700' }}>{subTeam.gender}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontWeight: '600' }}>Age Group:</span>
                                <span style={{
                                  color: '#f9fafb',
                                  fontWeight: '700',
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  border: '1px solid rgba(239, 68, 68, 0.45)',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '999px'
                                }}>
                                  {subTeam.ageGroup}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Age Group Team */}
                    {!showAddAgeGroup ? (
                      <button
                        onClick={() => setShowAddAgeGroup(true)}
                        disabled={ageGroupSaving}
                        style={{
                          marginTop: '1rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '16px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                          backgroundSize: '200% 100%',
                          color: 'white',
                          fontSize: '0.95rem',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 6px 18px rgba(220, 0, 0, 0.25)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundPosition = '100% 50%'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.4), 0 22px 40px rgba(220, 0, 0, 0.55)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundPosition = '0% 50%'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(220, 0, 0, 0.25)'; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                        Add Age Group Team
                      </button>
                    ) : (
                      <div style={{
                        marginTop: '1rem',
                        padding: '1.25rem',
                        background: '#111827',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f9fafb', marginBottom: '1rem' }}>
                          New Age Group Team
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <input
                            type="text"
                            placeholder="Team name (e.g. U11 Boys)"
                            value={newAgeGroup.teamName}
                            onChange={(e) => setNewAgeGroup(prev => ({ ...prev, teamName: e.target.value }))}
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.15)',
                              background: 'rgba(255,255,255,0.05)',
                              color: '#f9fafb',
                              fontSize: '0.85rem',
                              outline: 'none'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <select
                              value={newAgeGroup.ageGroup}
                              onChange={(e) => setNewAgeGroup(prev => ({ ...prev, ageGroup: e.target.value }))}
                              style={{
                                flex: 1,
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: '#1f2937',
                                color: newAgeGroup.ageGroup ? '#f9fafb' : '#9ca3af',
                                fontSize: '0.85rem',
                                outline: 'none'
                              }}
                            >
                              <option value="">Age Group</option>
                              <option value="U7">U7</option>
                              <option value="U9">U9</option>
                              <option value="U11">U11</option>
                              <option value="U13">U13</option>
                              <option value="U15">U15</option>
                              <option value="U17">U17</option>
                              <option value="U19">U19</option>
                              <option value="Senior">Senior</option>
                            </select>
                            <select
                              value={newAgeGroup.gender}
                              onChange={(e) => setNewAgeGroup(prev => ({ ...prev, gender: e.target.value }))}
                              style={{
                                flex: 1,
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: '#1f2937',
                                color: newAgeGroup.gender ? '#f9fafb' : '#9ca3af',
                                fontSize: '0.85rem',
                                outline: 'none'
                              }}
                            >
                              <option value="">Gender</option>
                              <option value="Boys">Boys</option>
                              <option value="Girls">Girls</option>
                              <option value="Mixed">Mixed</option>
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <button
                              onClick={handleAddAgeGroup}
                              disabled={ageGroupSaving}
                              style={{
                                padding: '0.6rem 1.25rem',
                                borderRadius: '16px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                                backgroundSize: '200% 100%',
                                color: 'white',
                                fontSize: '0.85rem',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                cursor: ageGroupSaving ? 'not-allowed' : 'pointer',
                                opacity: ageGroupSaving ? 0.6 : 1,
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 12px rgba(220, 0, 0, 0.25)'
                              }}
                            >
                              {ageGroupSaving ? 'Saving...' : 'Add Team'}
                            </button>
                            <button
                              onClick={() => { setShowAddAgeGroup(false); setNewAgeGroup({ teamName: '', ageGroup: '', gender: '' }); }}
                              disabled={ageGroupSaving}
                              style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid #d1d5db',
                                background: 'transparent',
                                color: '#9ca3af',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: '#6ee7b7'
                    }}>
                      <strong>💡 Tip:</strong> All revenue from player registrations and product sales will be aggregated under your main team name: <strong>{team.teamName}</strong>
                    </div>
                  </div>

                  {/* Delete Age Group Confirmation Modal */}
                  {deleteAgeGroupConfirm !== null && (
                    <div style={{
                      position: 'fixed',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(0,0,0,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 9999
                    }}
                      onClick={() => setDeleteAgeGroupConfirm(null)}
                    >
                      <div
                        style={{
                          background: 'white',
                          borderRadius: '16px',
                          padding: '2rem',
                          maxWidth: '420px',
                          width: '90%',
                          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                          textAlign: 'center'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#fef2f2',
                          border: '2px solid #fca5a5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 1rem'
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                          </svg>
                        </div>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#111827' }}>Remove Age Group Team?</h3>
                        <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: '#6b7280', lineHeight: '1.5' }}>
                          Are you sure you want to remove <strong style={{ color: '#111827' }}>
                            {(team.submissionData?.[33] || team.ageGroupTeams || [])[deleteAgeGroupConfirm]?.teamName}
                          </strong>? This will update the database and submissions. This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => setDeleteAgeGroupConfirm(null)}
                            disabled={ageGroupSaving}
                            style={{
                              padding: '0.6rem 1.25rem',
                              borderRadius: '8px',
                              border: '1px solid #d1d5db',
                              background: 'white',
                              color: '#374151',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteAgeGroup(deleteAgeGroupConfirm)}
                            disabled={ageGroupSaving}
                            style={{
                              padding: '0.6rem 1.25rem',
                              borderRadius: '8px',
                              border: 'none',
                              background: '#dc2626',
                              color: 'white',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              cursor: ageGroupSaving ? 'not-allowed' : 'pointer',
                              opacity: ageGroupSaving ? 0.6 : 1
                            }}
                          >
                            {ageGroupSaving ? 'Removing...' : 'Yes, Remove'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Kit Design Sub-Tab */}
              {profileTab === 'kit' && (
                <div style={{
                  background: '#111827',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#f9fafb' }}>
                    Team Kit Design
                  </h3>

                  {(() => {
                    const kitDesign = allShirtDesigns.find(d => d.id === team.submissionData?.kitDesignId || d.name === team.submissionData?.kitDesignId);
                    const adminFallbackUrl = kitDesign?.imageUrl || '';
                    const kitPreviewUrl = kitDesignImageUrl || (isAdminMode ? adminFallbackUrl : '');

                    return (
                      <>
                        {isAdminMode && (
                          <div style={{
                            marginBottom: '1.5rem',
                            padding: '1.25rem',
                            borderRadius: '16px',
                            border: kitDesignDragActive ? '2px solid #dc2626' : '1px solid rgba(220, 38, 38, 0.35)',
                            background: kitDesignDragActive
                              ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.14) 0%, rgba(15, 23, 42, 0.08) 100%)'
                              : 'linear-gradient(135deg, rgba(15, 23, 42, 0.04) 0%, rgba(220, 38, 38, 0.08) 100%)',
                            boxShadow: kitDesignDragActive
                              ? '0 12px 28px rgba(220, 38, 38, 0.2)'
                              : '0 10px 24px rgba(15, 23, 42, 0.08)'
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setKitDesignDragActive(true);
                          }}
                          onDragLeave={() => setKitDesignDragActive(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setKitDesignDragActive(false);
                            const file = e.dataTransfer?.files?.[0];
                            if (file) handleKitDesignUpload(file);
                          }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleKitDesignUpload(file);
                              }}
                              disabled={kitDesignUploading}
                              style={{ display: 'none' }}
                              id="kit-design-upload"
                            />
                            <label
                              htmlFor="kit-design-upload"
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                                cursor: kitDesignUploading ? 'not-allowed' : 'pointer',
                                color: '#f9fafb',
                                fontWeight: '800'
                              }}
                            >
                              <span style={{ fontSize: '1rem' }}>
                                {kitDesignUploading ? 'Uploading...' : 'Drag & drop the final kit image, or click to upload'}
                              </span>
                              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: '600' }}>
                                Admin only. Max 5MB. JPG/PNG/GIF/WebP/SVG.
                              </span>
                            </label>
                            {kitDesignImageUrl && (
                              <button
                                type="button"
                                onClick={() => saveKitDesignImage('')}
                                style={{
                                  marginTop: '0.75rem',
                                  padding: '0.5rem 1rem',
                                  background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
                                  color: '#f9fafb',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontWeight: '700',
                                  cursor: 'pointer'
                                }}
                              >
                                Remove / Replace
                              </button>
                            )}
                            {kitDesignMessage && (
                              <div style={{ marginTop: '0.75rem', color: '#7f1d1d', fontWeight: '600', fontSize: '0.85rem' }}>
                                {kitDesignMessage}
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          className="kitDesignGrid"
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.25rem',
                            marginBottom: '1.5rem'
                          }}
                        >
                          <div style={{
                            width: '100%',
                            maxWidth: '560px'
                          }}>
                            <div style={{
                              border: '2px solid rgba(255,255,255,0.1)',
                              borderRadius: '16px',
                              overflow: 'hidden',
                              background: 'rgba(255,255,255,0.03)'
                            }}>
                              {kitPreviewUrl ? (
                                <img
                                  src={kitPreviewUrl}
                                  alt={kitDesign?.name || 'Kit design'}
                                  style={{
                                    width: '100%',
                                    height: '460px',
                                    objectFit: 'contain',
                                    background: 'rgba(255,255,255,0.03)'
                                  }}
                                />
                              ) : (
                                <div style={{
                                  width: '100%',
                                  height: '420px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#9ca3af',
                                  fontSize: '3rem'
                                }}>
                                  👕
                                </div>
                              )}
                            </div>
                            <div style={{
                              marginTop: '0.75rem',
                              fontSize: '0.85rem',
                              color: '#94a3b8',
                              fontWeight: '600',
                              textAlign: 'center'
                            }}>
                              Your Winter League Kit for 2026
                            </div>
                          </div>
                        </div>

                        <div style={{
                          padding: '1rem',
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: '#93c5fd'
                        }}>
                          <strong>📝 Note:</strong> This is the kit design you selected during team registration. To change your kit design, please contact the league administrator.
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Profile Settings Sub-Tab */}
              {profileTab === 'settings' && (
                <div>
                  {/* Email Update */}
                  <div style={{
                    background: '#111827',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#f9fafb' }}>
                      Email Address
                    </h3>
                    <form onSubmit={handleUpdateEmail}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem' }}>
                          Email
                        </label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            background: '#1f2937',
                            color: '#f9fafb'
                          }}
                        />
                      </div>
                      <button
                        type="submit"
                        style={{
                          padding: '0.65rem 1.5rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Update Email
                      </button>
                    </form>
                  </div>

                  {/* Password Update */}
                  <div style={{
                    background: '#111827',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#f9fafb' }}>
                      Change Password
                    </h3>

                    {!changingPassword ? (
                      <button
                        onClick={() => setChangingPassword(true)}
                        style={{
                          padding: '0.65rem 1.5rem',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Change Password
                      </button>
                    ) : (
                      <form onSubmit={handleChangePassword}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem' }}>
                            New Password
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Enter new password (min 6 characters)"
                            style={{
                              width: '100%',
                              padding: '0.65rem',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              background: '#1f2937',
                              color: '#f9fafb'
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem' }}>
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Re-enter new password"
                            style={{
                              width: '100%',
                              padding: '0.65rem',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              background: '#1f2937',
                              color: '#f9fafb'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button
                            type="submit"
                            style={{
                              padding: '0.65rem 1.5rem',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Save Password
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChangingPassword(false);
                              setNewPassword('');
                              setConfirmPassword('');
                              setPasswordMessage('');
                            }}
                            style={{
                              padding: '0.65rem 1.5rem',
                              background: 'rgba(255,255,255,0.08)',
                              color: '#94a3b8',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {passwordMessage && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem 1rem',
                      background: passwordMessage.includes('success') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: passwordMessage.includes('success') ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: passwordMessage.includes('success') ? '#6ee7b7' : '#fca5a5',
                      fontSize: '0.85rem'
                    }}>
                      {passwordMessage}
                    </div>
                  )}
                </div>
              )}

              {/* Banking Details Sub-Tab */}
              {profileTab === 'banking' && (
                <div style={{
                  background: '#111827',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#f9fafb' }}>
                      Banking Information
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      These details will be used for payout transfers. Please ensure all information is accurate.
                    </p>
                  </div>

                  <form onSubmit={handleUpdateBanking}>
                    <div
                      className="profileTwoColumnGrid"
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}
                    >
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem' }}>
                          Account Holder Name *
                        </label>
                        <input
                          type="text"
                          value={bankingDetails.accountHolder}
                          onChange={(e) => setBankingDetails({...bankingDetails, accountHolder: e.target.value})}
                          required
                          placeholder="Full name as per bank account"
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            background: '#1f2937',
                            color: '#f9fafb'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem' }}>
                          Bank Name *
                        </label>
                        <select
                          value={bankingDetails.bankName}
                          onChange={(e) => setBankingDetails({...bankingDetails, bankName: e.target.value, otherBankName: ''})}
                          required
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            background: '#1f2937',
                            color: '#f9fafb'
                          }}
                        >
                          <option value="">Select Bank</option>
                          <option value="ABSA">ABSA</option>
                          <option value="African Bank">African Bank</option>
                          <option value="Bidvest Bank">Bidvest Bank</option>
                          <option value="Capitec Bank">Capitec Bank</option>
                          <option value="Discovery Bank">Discovery Bank</option>
                          <option value="FNB (First National Bank)">FNB (First National Bank)</option>
                          <option value="Grindrod Bank">Grindrod Bank</option>
                          <option value="Investec">Investec</option>
                          <option value="Nedbank">Nedbank</option>
                          <option value="Old Mutual Bank">Old Mutual Bank</option>
                          <option value="Sasfin Bank">Sasfin Bank</option>
                          <option value="Standard Bank">Standard Bank</option>
                          <option value="TymeBank">TymeBank</option>
                          <option value="Ubank">Ubank</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {bankingDetails.bankName === 'Other' && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem' }}>
                            Bank Name (Please specify) *
                          </label>
                          <input
                            type="text"
                            value={bankingDetails.otherBankName}
                            onChange={(e) => setBankingDetails({...bankingDetails, otherBankName: e.target.value})}
                            required
                            placeholder="Enter bank name"
                            style={{
                              width: '100%',
                              padding: '0.65rem',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              fontSize: '0.9rem',
                              background: '#1f2937',
                              color: '#f9fafb'
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem' }}>
                          Account Type *
                        </label>
                        <select
                          value={bankingDetails.accountType}
                          onChange={(e) => setBankingDetails({...bankingDetails, accountType: e.target.value})}
                          required
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            background: '#1f2937',
                            color: '#f9fafb'
                          }}
                        >
                          <option value="Cheque">Cheque Account</option>
                          <option value="Savings">Savings Account</option>
                          <option value="Current">Current Account</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem' }}>
                          Account Number *
                        </label>
                        <input
                          type="text"
                          value={bankingDetails.accountNumber}
                          onChange={(e) => setBankingDetails({...bankingDetails, accountNumber: e.target.value})}
                          required
                          placeholder="Account number"
                          pattern="[0-9]{8,15}"
                          title="Please enter a valid account number (8-15 digits)"
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            background: '#1f2937',
                            color: '#f9fafb'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', marginBottom: '0.4rem' }}>
                          Branch Code
                        </label>
                        <input
                          type="text"
                          value={bankingDetails.branchCode}
                          onChange={(e) => setBankingDetails({...bankingDetails, branchCode: e.target.value})}
                          placeholder="6-digit branch code (optional)"
                          pattern="[0-9]{6}"
                          title="Please enter a valid 6-digit branch code"
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            background: '#1f2937',
                            color: '#f9fafb'
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      style={{
                        padding: '0.75rem 1.75rem',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      💾 Save Banking Details
                    </button>
                  </form>

                  {bankingMessage && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem 1rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      color: '#6ee7b7',
                      fontSize: '0.85rem'
                    }}>
                      {bankingMessage}
                    </div>
                  )}

                  {team.bankingDetails && (
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#6ee7b7'
                    }}>
                      <strong>✓ Banking details saved</strong> - Last updated: {new Date(team.bankingDetails.updatedAt).toLocaleDateString()}
                    </div>
                  )}

                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#fcd34d'
                  }}>
                    <strong>⚠️ Important:</strong> Your banking details must be saved before requesting a payout. The admin will use these details to process your payment transfer.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}
        
        {/* Role Editor Modal */}
        {editingPlayerRoles && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setEditingPlayerRoles(null)}
          >
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
                Edit Player Roles
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {['Batsman', 'Bowler', 'All Rounder'].map(role => {
                  const isSelected = (editingPlayerRoles.roles || []).includes(role);
                  return (
                    <label key={role} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      padding: '1rem',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      background: isSelected ? '#fee2e2' : '#fafafa',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const currentRoles = editingPlayerRoles.roles || [];
                          const newRoles = e.target.checked
                            ? [...currentRoles, role]
                            : currentRoles.filter(r => r !== role);
                          setEditingPlayerRoles({ ...editingPlayerRoles, roles: newRoles });
                        }}
                        style={{
                          width: '1.5rem',
                          height: '1.5rem',
                          cursor: 'pointer',
                          accentColor: '#dc0000'
                        }}
                      />
                      <span style={{
                        fontSize: '1rem',
                        color: '#111827',
                        fontWeight: isSelected ? '600' : '400'
                      }}>
                        {role}
                      </span>
                    </label>
                  );
                })}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => {
                    handleUpdatePlayerRoles(editingPlayerRoles.playerId, editingPlayerRoles.roles);
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#059669'}
                  onMouseOut={(e) => e.target.style.background = '#10b981'}
                >
                  Save Roles
                </button>
                <button
                  onClick={() => setEditingPlayerRoles(null)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#4b5563'}
                  onMouseOut={(e) => e.target.style.background = '#6b7280'}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {removalModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2100
          }}
          onClick={() => setRemovalModal(null)}
          >
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '520px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.75rem' }}>
                Request Player Removal
              </h3>
              <p style={{ marginTop: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                Player: <strong>{removalModal.name || removalModal.playerName}</strong>
              </p>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.5rem' }}>
                Message to admin
              </label>
              <textarea
                value={removalMessage}
                onChange={(e) => setRemovalMessage(e.target.value)}
                placeholder="Explain why this player should be removed"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  marginBottom: '1rem'
                }}
              />
              {removalError && (
                <div style={{
                  marginBottom: '1rem',
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem'
                }}>
                  {removalError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={submitRemovalRequest}
                  disabled={removalSubmitting}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: removalSubmitting ? '#9ca3af' : '#dc0000',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: removalSubmitting ? 'wait' : 'pointer'
                  }}
                >
                  {removalSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  onClick={() => setRemovalModal(null)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        <style jsx global>{`
          .teamPortalHeaderTitle,
          .teamPortalHeaderSubtitle {
            word-break: break-word;
            overflow-wrap: anywhere;
            white-space: normal;
          }

          @media (max-width: 900px) {
            .teamPortalContent {
              padding: 1.5rem;
            }
          }

          @media (max-width: 768px) {
            .teamPortalHeader {
              padding: 1rem;
            }

            .teamPortalHeaderInner {
              flex-direction: column;
              align-items: flex-start;
              gap: 1rem;
            }

            .teamPortalHeaderLeft {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.5rem;
              width: 100%;
            }

            .teamPortalHeaderText {
              width: 100%;
            }

            .teamPortalHeaderTitle {
              font-size: 1.25rem;
            }

            .teamPortalHeaderSubtitle {
              font-size: 0.8rem;
            }

            .teamPortalTeamSelect {
              width: 100%;
              min-width: unset;
            }

            .teamPortalBanner {
              padding: 1rem;
              flex-direction: column;
              align-items: flex-start;
            }

            .teamPortalLogoFrame {
              width: 64px;
              height: 64px;
            }

            .teamPortalContent {
              padding: 1rem;
            }

            .teamDashboardGrid {
              grid-template-columns: 1fr;
              gap: 1rem;
            }

            .teamDashboardCard {
              padding: 1.25rem;
            }

            .profileCardGrid {
              grid-template-columns: 1fr;
            }

            .profileInfoGrid {
              grid-template-columns: 1fr;
            }

            .kitDesignGrid {
              grid-template-columns: 1fr;
            }

            .profileTwoColumnGrid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 600px) {
            .teamDashboardCard {
              text-align: left;
              position: relative;
              background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(3, 7, 18, 0.98) 60%, rgba(220, 0, 0, 0.45) 100%);
              border: 1px solid rgba(239, 68, 68, 0.55);
              box-shadow: 0 14px 34px rgba(220, 0, 0, 0.35), 0 0 20px rgba(255, 255, 255, 0.2);
              overflow: hidden;
            }

            .teamDashboardCard:active {
              transform: translateY(-2px) scale(0.99);
              box-shadow: 0 16px 36px rgba(220, 0, 0, 0.38), 0 0 26px rgba(255, 255, 255, 0.22);
            }

            .teamDashboardCard::before {
              content: '';
              position: absolute;
              inset: 0;
              background: radial-gradient(circle at top, rgba(239, 68, 68, 0.35), transparent 60%);
              opacity: 0.9;
              pointer-events: none;
              animation: mobileCardGlow 3.2s ease-in-out infinite;
            }

            .teamDashboardCard::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 3px;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), rgba(239, 68, 68, 0.9), transparent);
              opacity: 0.9;
              pointer-events: none;
            }
            }

          @keyframes mobileCardGlow {
            0%, 100% { opacity: 0.65; }
            50% { opacity: 1; }
          }
          }

          .playersTableWrap {
            width: 100%;
            overflow-x: auto;
          }

          .playersTableWrap table {
            min-width: 720px;
          }
        `}</style>
      </div>
    </>
  );
}
