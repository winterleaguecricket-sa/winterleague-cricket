import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { verifyTeamCredentials, getTeamById, getAllTeamProfiles, updateTeamPassword, updateTeamEmail, updateTeamBankingDetails, markMessageAsRead, getTeamRevenue, getTeamRevenueBreakdown, createPayoutRequest, getPendingPayoutForTeam, getPayoutRequestsByTeam, movePlayerToSubTeam, duplicatePlayerToSubTeam } from '../data/teams';
import { getShirtDesignById } from '../data/shirtDesigns';

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

  useEffect(() => {
    // Check for admin bypass or existing session
    if (typeof window !== 'undefined') {
      // Check if admin wants to bypass login
      const urlParams = new URLSearchParams(window.location.search);
      const adminBypass = urlParams.get('admin') === 'true';
      
      if (adminBypass) {
        setIsAdminMode(true);
        setIsAuthenticated(true);
        const teams = getAllTeamProfiles();
        setAllTeams(teams);
        if (teams.length > 0) {
          setTeam(teams[0]);
          setSelectedTeamId(teams[0].id);
        }
        return;
      }
      
      // Check for existing team session
      const savedTeamId = localStorage.getItem('teamId');
      if (savedTeamId) {
        const teamData = getTeamById(parseInt(savedTeamId));
        if (teamData) {
          setTeam(teamData);
          setIsAuthenticated(true);
        }
      }
    }
  }, []);

  // Auto-refresh when switching to revenue tab
  useEffect(() => {
    if (activeTab === 'revenue' && team) {
      handleRefreshData();
    }
  }, [activeTab]);

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

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    const teamData = verifyTeamCredentials(identifier, password);
    if (teamData) {
      setTeam(teamData);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('teamId', teamData.id.toString());
      }
    } else {
      setLoginError('Invalid team name/email or password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdminMode(false);
    setTeam(null);
    setIdentifier('');
    setPassword('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('teamId');
    }
  };

  const handleTeamSwitch = (teamId) => {
    const selectedTeam = allTeams.find(t => t.id === parseInt(teamId));
    if (selectedTeam) {
      setTeam(selectedTeam);
      setSelectedTeamId(selectedTeam.id);
      setActiveTab('dashboard');
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (isAdminMode) {
      const teams = getAllTeamProfiles();
      setAllTeams(teams);
      if (team) {
        const updatedTeam = teams.find(t => t.id === team.id);
        if (updatedTeam) {
          setTeam(updatedTeam);
        }
      }
    } else {
      const updatedTeam = getTeamById(team.id);
      if (updatedTeam) {
        setTeam(updatedTeam);
      }
    }
    setRefreshKey(prev => prev + 1);
    setIsRefreshing(false);
  };

  const handleMovePlayer = (playerId, currentSubTeam, newSubTeam) => {
    if (team?.id) {
      const success = movePlayerToSubTeam(team.id, playerId, newSubTeam);
      if (success) {
        const updatedTeam = getTeamById(team.id);
        setTeam(updatedTeam);
        setPlayerActionMenu(null);
      }
    }
  };

  const handleDuplicatePlayer = (playerId, currentSubTeam, newSubTeam) => {
    if (team?.id) {
      const duplicated = duplicatePlayerToSubTeam(team.id, playerId, newSubTeam);
      if (duplicated) {
        const updatedTeam = getTeamById(team.id);
        setTeam(updatedTeam);
        setPlayerActionMenu(null);
      }
    }
  };

  const handleUpdatePlayerRoles = (playerId, newRoles) => {
    if (team?.id) {
      const player = team.players.find(p => p.id === playerId);
      if (player) {
        player.roles = newRoles;
        const updatedTeam = getTeamById(team.id);
        setTeam(updatedTeam);
        setEditingPlayerRoles(null);
      }
    }
  };

  const handleRequestPayout = async () => {
    setPayoutMessage('');
    
    const breakdown = getTeamRevenueBreakdown(team.id);
    
    console.log('Team ID:', team.id);
    console.log('Revenue breakdown:', breakdown);
    
    if (breakdown.total <= 0) {
      setPayoutMessage('No revenue available to request payout');
      setTimeout(() => setPayoutMessage(''), 3000);
      return;
    }
    
    const pendingRequest = getPendingPayoutForTeam(team.id);
    console.log('Pending request check:', pendingRequest);
    
    if (pendingRequest) {
      setPayoutMessage('You already have a pending payout request');
      setTimeout(() => setPayoutMessage(''), 3000);
      return;
    }
    
    const request = createPayoutRequest(team.id);
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

  const handleChangePassword = (e) => {
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

    updateTeamPassword(team.id, newPassword);
    setPasswordMessage('Password updated successfully!');
    setNewPassword('');
    setConfirmPassword('');
    setChangingPassword(false);
    setTimeout(() => setPasswordMessage(''), 3000);
  };

  const handleUpdateEmail = (e) => {
    e.preventDefault();
    updateTeamEmail(team.id, editEmail);
    const updatedTeam = getTeamById(team.id);
    setTeam(updatedTeam);
    setPasswordMessage('Email updated successfully!');
    setTimeout(() => setPasswordMessage(''), 3000);
  };

  const handleUpdateBanking = (e) => {
    e.preventDefault();
    const finalBankingDetails = {
      ...bankingDetails,
      bankName: bankingDetails.bankName === 'Other' ? bankingDetails.otherBankName : bankingDetails.bankName
    };
    updateTeamBankingDetails(team.id, finalBankingDetails);
    const updatedTeam = getTeamById(team.id);
    setTeam(updatedTeam);
    setBankingMessage('Banking details saved successfully!');
    setTimeout(() => setBankingMessage(''), 3000);
  };

  const handleMarkMessageRead = (messageId) => {
    markMessageAsRead(team.id, messageId);
    const updatedTeam = getTeamById(team.id);
    setTeam(updatedTeam);
  };

  const unreadMessages = team?.messages?.filter(m => !m.read).length || 0;

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
                  Team Name or Email
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter team name or email"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
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
                Use your team name or email and the temporary password sent to you after registration.
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
        <title>{team.teamName} - Team Portal</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          color: 'white',
          padding: '1rem 2rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>
                  🏏 {team?.teamName || 'No Team Selected'}
                </h1>
                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>
                  WL Team Portal {isAdminMode && <span style={{ background: 'rgba(255,255,255,0.3)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Admin View</span>}
                </p>
              </div>
              {isAdminMode && allTeams.length > 0 && (
                <select
                  value={selectedTeamId || ''}
                  onChange={(e) => handleTeamSwitch(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'white',
                    color: '#111827',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
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

        {isAdminMode && !team && (
          <div style={{
            maxWidth: '1400px',
            margin: '2rem auto',
            padding: '3rem',
            background: 'white',
            borderRadius: '12px',
            border: '2px solid #fef3c7',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏏</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#111827' }}>
              No Teams Registered Yet
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              There are no team profiles in the system yet. Teams will appear here after they register.
            </p>
            <Link
              href="/admin"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '700'
              }}
            >
              ← Back to Admin Panel
            </Link>
          </div>
        )}

        {team && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '2rem'
        }}>
          {/* Status Badge */}
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              background: team.status === 'active' ? '#d1fae5' : 
                          team.status === 'approved' ? '#dbeafe' :
                          team.status === 'pending' ? '#fef3c7' : '#fee2e2',
              color: team.status === 'active' ? '#065f46' :
                     team.status === 'approved' ? '#1e40af' :
                     team.status === 'pending' ? '#92400e' : '#991b1b',
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

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '0.5rem',
            flexWrap: 'wrap'
          }}>
            {['dashboard', 'profile', 'players', 'fixtures', 'messages', 'revenue'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.65rem 1.5rem',
                  background: activeTab === tab 
                    ? 'linear-gradient(135deg, #000000 0%, #dc0000 100%)' 
                    : '#f3f4f6',
                  color: activeTab === tab ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}
              >
                {tab === 'dashboard' && '📊'} 
                {tab === 'players' && '👥'} 
                {tab === 'fixtures' && '📅'} 
                {tab === 'messages' && '💬'} 
                {tab === 'revenue' && '💰'}
                {tab === 'profile' && '⚙️'}
                {' '}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'messages' && unreadMessages > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-0.25rem',
                    right: '-0.25rem',
                    background: '#dc0000',
                    color: 'white',
                    borderRadius: '50%',
                    width: '1.25rem',
                    height: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: '900'
                  }}>
                    {unreadMessages}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#111827' }}>
                Team Dashboard
              </h2>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#111827', marginBottom: '0.25rem' }}>
                    {team.players?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>
                    Players
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#111827', marginBottom: '0.25rem' }}>
                    {team.fixtures?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>
                    Upcoming Fixtures
                  </div>
                </div>

                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
                  <div style={{ fontSize: '2rem', fontWeight: '900', color: '#111827', marginBottom: '0.25rem' }}>
                    {unreadMessages}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '600' }}>
                    Unread Messages
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div style={{
                background: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>
                  Team Information
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div>
                    <strong style={{ color: '#6b7280', fontSize: '0.85rem' }}>Coach Name:</strong>
                    <div style={{ color: '#111827', fontSize: '1rem', fontWeight: '600' }}>{team.coachName}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#6b7280', fontSize: '0.85rem' }}>Email:</strong>
                    <div style={{ color: '#111827', fontSize: '1rem', fontWeight: '600' }}>{team.email}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#6b7280', fontSize: '0.85rem' }}>Phone:</strong>
                    <div style={{ color: '#111827', fontSize: '1rem', fontWeight: '600' }}>{team.phone}</div>
                  </div>
                  <div>
                    <strong style={{ color: '#6b7280', fontSize: '0.85rem' }}>Registration Date:</strong>
                    <div style={{ color: '#111827', fontSize: '1rem', fontWeight: '600' }}>
                      {new Date(team.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {team.lastLogin && (
                    <div>
                      <strong style={{ color: '#6b7280', fontSize: '0.85rem' }}>Last Login:</strong>
                      <div style={{ color: '#111827', fontSize: '1rem', fontWeight: '600' }}>
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
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#111827' }}>
                Team Players
              </h2>

              {team.players?.length > 0 ? (
                (() => {
                  // Group players by sub-team
                  const subTeams = team.submissionData?.[33] || [];
                  const playersGrouped = {};
                  
                  // Initialize groups for each sub-team
                  subTeams.forEach(subTeam => {
                    playersGrouped[subTeam.teamName] = {
                      info: subTeam,
                      players: []
                    };
                  });
                  
                  // Add ungrouped category for players without sub-team assignment
                  playersGrouped['Ungrouped'] = {
                    info: { teamName: 'Ungrouped', gender: '', ageGroup: '' },
                    players: []
                  };
                  
                  // Group players
                  team.players.forEach(player => {
                    const subTeamName = player.subTeam || 'Ungrouped';
                    if (playersGrouped[subTeamName]) {
                      playersGrouped[subTeamName].players.push(player);
                    } else {
                      playersGrouped['Ungrouped'].players.push(player);
                    }
                  });
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {Object.entries(playersGrouped).map(([subTeamName, group]) => {
                        if (group.players.length === 0) return null;
                        
                        return (
                          <div key={subTeamName} style={{
                            background: 'white',
                            borderRadius: '12px',
                            border: '2px solid #e5e7eb',
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
                                  {subTeamName}
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
                                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                                borderLeft: '4px solid #dc0000',
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
                                    color: '#991b1b'
                                  }}>
                                    Minimum 15 players required •
                                  </span>
                                  <span style={{ 
                                    fontSize: '0.85rem', 
                                    color: '#7f1d1d',
                                    marginLeft: '0.5rem'
                                  }}>
                                    Currently <strong>{group.players.length}</strong> registered • <strong>{15 - group.players.length} more</strong> needed
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Players table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#f9fafb' }}>
                                  <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280' }}>
                                    #
                                  </th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280' }}>
                                    Name
                                  </th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280' }}>
                                    Roles
                                  </th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280' }}>
                                    Shirt No.
                                  </th>
                                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280' }}>
                                    Joined
                                  </th>
                                  {(isAdminMode || isAuthenticated) && (
                                    <th style={{ padding: '0.75rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280' }}>
                                      Actions
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {group.players.map((player, index) => (
                                  <tr key={player.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', color: '#6b7280' }}>
                                      {index + 1}
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.95rem', color: '#111827', fontWeight: '600' }}>
                                      {player.name}
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#374151' }}>
                                      {player.roles ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                          {(Array.isArray(player.roles) ? player.roles : [player.roles]).map((role, idx) => (
                                            <span key={idx} style={{
                                              display: 'inline-block',
                                              background: '#dbeafe',
                                              color: '#1e40af',
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
                                    <td style={{ padding: '0.75rem', fontSize: '0.9rem', color: '#374151' }}>
                                      <span style={{
                                        display: 'inline-block',
                                        background: '#f3f4f6',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        color: '#374151'
                                      }}>
                                        #{player.shirtNumber || player.jerseyNumber || '-'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
                                      {new Date(player.addedAt).toLocaleDateString()}
                                    </td>
                                    {(isAdminMode || isAuthenticated) && (
                                      <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
                                        {playerActionMenu?.playerId === player.id ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'stretch' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.25rem' }}>MOVE TO:</div>
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
                                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280', marginTop: '0.5rem', marginBottom: '0.25rem' }}>COPY TO:</div>
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
                                              onClick={() => setEditingPlayerRoles({ playerId: player.id, roles: player.roles || [] })}
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
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div style={{
                  background: 'white',
                  padding: '3rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    No Players Added Yet
                  </p>
                  <p style={{ fontSize: '0.9rem' }}>
                    Your player roster will appear here once added by the admin.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Fixtures Tab */}
          {activeTab === 'fixtures' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#111827' }}>
                Match Fixtures
              </h2>

              {team.fixtures?.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {team.fixtures.map((fixture) => (
                    <div
                      key={fixture.id}
                      style={{
                        background: 'white',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
                            {team.teamName} vs {fixture.opponent}
                          </h3>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            📍 {fixture.venue}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#374151' }}>
                        <div>
                          <strong style={{ color: '#6b7280' }}>Date:</strong> {new Date(fixture.date).toLocaleDateString()}
                        </div>
                        <div>
                          <strong style={{ color: '#6b7280' }}>Time:</strong> {fixture.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  background: 'white',
                  padding: '3rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    No Fixtures Scheduled
                  </p>
                  <p style={{ fontSize: '0.9rem' }}>
                    Your match schedule will appear here once fixtures are assigned.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#111827' }}>
                Messages from Admin
              </h2>

              {team.messages?.length > 0 ? (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {team.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((message) => (
                    <div
                      key={message.id}
                      style={{
                        background: message.read ? 'white' : '#eff6ff',
                        padding: '1.25rem',
                        borderRadius: '12px',
                        border: message.read ? '1px solid #e5e7eb' : '2px solid #3b82f6',
                        position: 'relative'
                      }}
                    >
                      {!message.read && (
                        <span style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          background: '#3b82f6',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          textTransform: 'uppercase'
                        }}>
                          New
                        </span>
                      )}
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                        {new Date(message.createdAt).toLocaleString()}
                      </div>
                      <p style={{ fontSize: '1rem', color: '#111827', lineHeight: '1.6', margin: 0 }}>
                        {message.message}
                      </p>
                      {!message.read && (
                        <button
                          onClick={() => handleMarkMessageRead(message.id)}
                          style={{
                            marginTop: '0.75rem',
                            padding: '0.4rem 0.75rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  background: 'white',
                  padding: '3rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  textAlign: 'center',
                  color: '#6b7280'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    No Messages Yet
                  </p>
                  <p style={{ fontSize: '0.9rem' }}>
                    Messages from the league admin will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Revenue Tab */}
          {activeTab === 'revenue' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#111827' }}>
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
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
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
                const revenue = getTeamRevenue(team.id);
                const breakdown = getTeamRevenueBreakdown(team.id);

                return (
                  <>
                    {/* Revenue Summary Cards */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1.5rem',
                      marginBottom: '2rem'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                      }}>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: '600' }}>
                          Player Registration Markup
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900' }}>
                          R{breakdown.markup.toFixed(2)}
                        </div>
                      </div>

                      <div style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                      }}>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: '600' }}>
                          Product Commission (10%)
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900' }}>
                          R{breakdown.commission.toFixed(2)}
                        </div>
                      </div>

                      <div style={{
                        background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(220, 0, 0, 0.3)'
                      }}>
                        <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem', fontWeight: '600' }}>
                          Total Revenue
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: '900' }}>
                          R{breakdown.total.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Payout Request Section */}
                    <div style={{
                      background: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      marginBottom: '2rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#111827', fontWeight: '700', marginBottom: '0.25rem' }}>
                            Request Payout
                          </h3>
                          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
                            Submit a payout request for your accumulated revenue
                          </p>
                        </div>
                        <button
                          onClick={handleRequestPayout}
                          disabled={breakdown.total <= 0 || getPendingPayoutForTeam(team.id)}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: breakdown.total <= 0 || getPendingPayoutForTeam(team.id) 
                              ? '#e5e7eb' 
                              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: breakdown.total <= 0 || getPendingPayoutForTeam(team.id) ? '#9ca3af' : 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: '700',
                            cursor: breakdown.total <= 0 || getPendingPayoutForTeam(team.id) ? 'not-allowed' : 'pointer',
                            boxShadow: breakdown.total <= 0 || getPendingPayoutForTeam(team.id) 
                              ? 'none' 
                              : '0 4px 12px rgba(16, 185, 129, 0.3)',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (breakdown.total > 0 && !getPendingPayoutForTeam(team.id)) {
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
                          background: payoutMessage.includes('successfully') ? '#d1fae5' : '#fee2e2',
                          border: payoutMessage.includes('successfully') ? '1px solid #86efac' : '1px solid #fca5a5',
                          borderRadius: '6px',
                          color: payoutMessage.includes('successfully') ? '#065f46' : '#991b1b',
                          fontSize: '0.85rem',
                          marginTop: '1rem'
                        }}>
                          {payoutMessage}
                        </div>
                      )}
                      
                      {(() => {
                        const pendingRequest = getPendingPayoutForTeam(team.id);
                        if (pendingRequest) {
                          return (
                            <div style={{
                              marginTop: '1rem',
                              padding: '1rem',
                              background: '#fef3c7',
                              border: '2px solid #f59e0b',
                              borderRadius: '8px'
                            }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#92400e', marginBottom: '0.5rem' }}>
                                ⏳ Pending Payout Request
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
                                Request ID: {pendingRequest.id} • Amount: R{pendingRequest.amount.toFixed(2)}<br />
                                Requested: {new Date(pendingRequest.requestedAt).toLocaleString()}<br />
                                Status: <strong style={{ textTransform: 'uppercase' }}>{pendingRequest.status}</strong>
                              </div>
                            </div>
                          );
                        }
                      })()}
                      
                      {(() => {
                        const teamPayoutHistory = getPayoutRequestsByTeam(team.id).filter(r => r.status === 'paid');
                        if (teamPayoutHistory.length > 0) {
                          return (
                            <div style={{ marginTop: '1.5rem' }}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#374151', marginBottom: '0.75rem' }}>
                                Payout History
                              </h4>
                              {teamPayoutHistory.slice(0, 3).map(payout => (
                                <div
                                  key={payout.id}
                                  style={{
                                    padding: '0.75rem',
                                    background: '#f9fafb',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    marginBottom: '0.5rem',
                                    fontSize: '0.8rem',
                                    color: '#6b7280'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                    <span>Request #{payout.id}</span>
                                    <span style={{ fontWeight: '700', color: '#059669' }}>R{payout.amount.toFixed(2)}</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem' }}>
                                    Paid: {new Date(payout.processedAt).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        }
                      })()}
                    </div>

                    {/* Revenue Breakdown Info */}
                    <div style={{
                      background: '#dbeafe',
                      border: '2px solid #3b82f6',
                      borderRadius: '10px',
                      padding: '1.25rem',
                      marginBottom: '2rem'
                    }}>
                      <h3 style={{ 
                        fontSize: '0.95rem', 
                        marginBottom: '0.75rem', 
                        color: '#1e40af', 
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        💡 Revenue Sources
                      </h3>
                      <ul style={{ 
                        fontSize: '0.85rem', 
                        color: '#1e40af', 
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
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: '#f9fafb',
                          padding: '1rem 1.5rem',
                          borderBottom: '2px solid #e5e7eb'
                        }}>
                          <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#111827', fontWeight: '700' }}>
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
                                background: entry.type === 'player-registration-markup' ? '#f0fdf4' : '#eff6ff',
                                border: entry.type === 'player-registration-markup' ? '2px solid #86efac' : '2px solid #93c5fd',
                                borderRadius: '10px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem' }}>
                                    {entry.type === 'player-registration-markup' ? (
                                      <>🏏 Player Registration - {entry.playerName}</>
                                    ) : (
                                      <>🛍️ Product Commission - {entry.customerName}</>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                    {new Date(entry.date).toLocaleString()}
                                  </div>
                                </div>
                                <div style={{
                                  fontSize: '1.25rem',
                                  fontWeight: '900',
                                  color: entry.type === 'player-registration-markup' ? '#059669' : '#2563eb'
                                }}>
                                  +R{entry.amount.toFixed(2)}
                                </div>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: '0.5rem' }}>
                                {entry.details}
                              </div>
                              {entry.orderNumber && (
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#6b7280', 
                                  marginTop: '0.5rem',
                                  padding: '0.35rem 0.65rem',
                                  background: 'white',
                                  borderRadius: '4px',
                                  display: 'inline-block'
                                }}>
                                  Order: {entry.orderNumber}
                                </div>
                              )}
                              {entry.submissionId && (
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#6b7280', 
                                  marginTop: '0.5rem',
                                  padding: '0.35rem 0.65rem',
                                  background: 'white',
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
                        background: 'white',
                        padding: '3rem',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                        textAlign: 'center',
                        color: '#6b7280'
                      }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
                        <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
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
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '0.5rem'
              }}>
                {['details', 'kit', 'settings', 'banking'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setProfileTab(tab)}
                    style={{
                      padding: '0.5rem 1.25rem',
                      background: profileTab === tab ? '#f3f4f6' : 'transparent',
                      color: profileTab === tab ? '#111827' : '#6b7280',
                      border: profileTab === tab ? '1px solid #d1d5db' : 'none',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab === 'details' && '📋 Team Details'}
                    {tab === 'kit' && '👕 Kit Design'}
                    {tab === 'settings' && '⚙️ Profile Settings'}
                    {tab === 'banking' && '🏦 Banking Details'}
                  </button>
                ))}
              </div>

              {/* Team Details Sub-Tab */}
              {profileTab === 'details' && (
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>
                    Team Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Team Name
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: '#f9fafb',
                        color: '#111827'
                      }}>
                        {team.teamName}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Team Manager
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: '#f9fafb',
                        color: '#111827'
                      }}>
                        {team.managerName}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Manager Contact
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: '#f9fafb',
                        color: '#111827'
                      }}>
                        {team.managerPhone}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Email
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: '#f9fafb',
                        color: '#111827'
                      }}>
                        {team.email}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Phone
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: '#f9fafb',
                        color: '#111827'
                      }}>
                        {team.phone}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Status
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: '#f9fafb',
                        color: '#111827',
                        textTransform: 'capitalize'
                      }}>
                        {team.status}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Registered
                      </label>
                      <div style={{
                        padding: '0.65rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        background: '#f9fafb',
                        color: '#111827'
                      }}>
                        {new Date(team.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: '#dbeafe',
                    border: '1px solid #93c5fd',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#1e40af'
                  }}>
                    <strong>📝 Note:</strong> To update team name, manager name, or contact number, please contact the league administrator.
                  </div>

                  {/* Sub-Teams Section */}
                  {team.submissionData && team.submissionData[33] && team.submissionData[33].length > 0 && (
                    <div style={{ marginTop: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🏆</span> Age Group Teams ({team.submissionData[33].length})
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {team.submissionData[33].map((subTeam, index) => (
                          <div 
                            key={index}
                            style={{
                              padding: '1rem',
                              border: '2px solid #e5e7eb',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)',
                              transition: 'all 0.3s'
                            }}
                          >
                            <div style={{ 
                              fontSize: '1.05rem', 
                              fontWeight: '700', 
                              color: '#111827',
                              marginBottom: '0.75rem',
                              paddingBottom: '0.75rem',
                              borderBottom: '2px solid #e5e7eb'
                            }}>
                              {subTeam.teamName}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: '#6b7280', fontWeight: '600' }}>Gender:</span>
                                <span style={{ color: '#111827', fontWeight: '700' }}>{subTeam.gender}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: '#6b7280', fontWeight: '600' }}>Age Group:</span>
                                <span style={{ 
                                  color: 'white',
                                  fontWeight: '700',
                                  background: 'linear-gradient(135deg, #dc0000 0%, #b30000 100%)',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '6px'
                                }}>
                                  {subTeam.ageGroup}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        color: '#166534'
                      }}>
                        <strong>💡 Tip:</strong> All revenue from player registrations and product sales will be aggregated under your main team name: <strong>{team.teamName}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Kit Design Sub-Tab */}
              {profileTab === 'kit' && (
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>
                    Team Kit Design
                  </h3>
                  
                  {team.submissionData?.kitDesignId ? (
                    <>
                      {(() => {
                        const kitDesign = getShirtDesignById(team.submissionData.kitDesignId);
                        return (
                          <div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '300px 1fr',
                              gap: '2rem',
                              marginBottom: '1.5rem'
                            }}>
                              <div>
                                <div style={{
                                  border: '2px solid #e5e7eb',
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                  background: '#f9fafb'
                                }}>
                                  {kitDesign?.imageUrl ? (
                                    <img 
                                      src={kitDesign.imageUrl} 
                                      alt={kitDesign.name}
                                      style={{
                                        width: '100%',
                                        height: '300px',
                                        objectFit: 'cover'
                                      }}
                                    />
                                  ) : (
                                    <div style={{
                                      width: '100%',
                                      height: '300px',
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
                              </div>
                              
                              <div>
                                <div style={{ marginBottom: '1.5rem' }}>
                                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.5rem' }}>
                                    Design Name
                                  </label>
                                  <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>
                                    {kitDesign?.name || 'Design not found'}
                                  </div>
                                </div>
                                
                                {team.submissionData.primaryColor && (
                                  <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.5rem' }}>
                                      Primary Color
                                    </label>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.75rem'
                                    }}>
                                      <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        background: team.submissionData.primaryColor
                                      }} />
                                      <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                                        {team.submissionData.primaryColor}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                {team.submissionData.secondaryColor && (
                                  <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#6b7280', marginBottom: '0.5rem' }}>
                                      Secondary Color
                                    </label>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.75rem'
                                    }}>
                                      <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        border: '2px solid #e5e7eb',
                                        background: team.submissionData.secondaryColor
                                      }} />
                                      <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                                        {team.submissionData.secondaryColor}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div style={{
                              padding: '1rem',
                              background: '#dbeafe',
                              border: '1px solid #93c5fd',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              color: '#1e40af'
                            }}>
                              <strong>📝 Note:</strong> This is the kit design you selected during team registration. To change your kit design, please contact the league administrator.
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div style={{
                      padding: '2rem',
                      background: '#f9fafb',
                      border: '2px dashed #d1d5db',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: '#6b7280'
                    }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👕</div>
                      <p style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                        No Kit Design Selected
                      </p>
                      <p style={{ fontSize: '0.9rem' }}>
                        No kit design was selected during registration. Please contact the administrator.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Profile Settings Sub-Tab */}
              {profileTab === 'settings' && (
                <div>
                  {/* Email Update */}
                  <div style={{
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    marginBottom: '1.5rem'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>
                      Email Address
                    </h3>
                    <form onSubmit={handleUpdateEmail}>
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
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
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
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
                    background: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#111827' }}>
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
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
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
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
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
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.9rem'
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
                              background: '#f3f4f6',
                              color: '#374151',
                              border: 'none',
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
                      background: passwordMessage.includes('success') ? '#d1fae5' : '#fee2e2',
                      border: passwordMessage.includes('success') ? '1px solid #86efac' : '1px solid #fca5a5',
                      borderRadius: '6px',
                      color: passwordMessage.includes('success') ? '#065f46' : '#991b1b',
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
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#111827' }}>
                      Banking Information
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      These details will be used for payout transfers. Please ensure all information is accurate.
                    </p>
                  </div>

                  <form onSubmit={handleUpdateBanking}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
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
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
                          Bank Name *
                        </label>
                        <select
                          value={bankingDetails.bankName}
                          onChange={(e) => setBankingDetails({...bankingDetails, bankName: e.target.value, otherBankName: ''})}
                          required
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
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
                          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
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
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
                          Account Type *
                        </label>
                        <select
                          value={bankingDetails.accountType}
                          onChange={(e) => setBankingDetails({...bankingDetails, accountType: e.target.value})}
                          required
                          style={{
                            width: '100%',
                            padding: '0.65rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                          }}
                        >
                          <option value="Cheque">Cheque Account</option>
                          <option value="Savings">Savings Account</option>
                          <option value="Current">Current Account</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
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
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
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
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
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
                      background: '#d1fae5',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      color: '#065f46',
                      fontSize: '0.85rem'
                    }}>
                      {bankingMessage}
                    </div>
                  )}

                  {team.bankingDetails && (
                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#166534'
                    }}>
                      <strong>✓ Banking details saved</strong> - Last updated: {new Date(team.bankingDetails.updatedAt).toLocaleDateString()}
                    </div>
                  )}

                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#92400e'
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
      </div>
    </>
  );
}
