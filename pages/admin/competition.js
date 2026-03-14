import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function AdminCompetition() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [saving, setSaving] = useState({});
  const [edits, setEdits] = useState({});
  const [filterAg, setFilterAg] = useState('all');

  const loadTeams = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/competition?all=true');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      // Flatten: deduplicate by teamId (a team appears once per age group, but cup_wins/isNewTeam is per-team)
      const teamMap = {};
      const ageGroups = data.ageGroups || {};
      for (const ag of Object.keys(ageGroups)) {
        for (const t of ageGroups[ag].teams) {
          if (!teamMap[t.teamId]) {
            teamMap[t.teamId] = {
              ...t,
              ageGroups: [ag]
            };
          } else {
            if (!teamMap[t.teamId].ageGroups.includes(ag)) {
              teamMap[t.teamId].ageGroups.push(ag);
            }
          }
        }
      }

      const teamList = Object.values(teamMap).sort((a, b) => a.teamName.localeCompare(b.teamName));
      setTeams(teamList);
    } catch (error) {
      console.error('Error loading teams:', error);
      showMessage('Failed to load teams', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeams(); }, []);

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEdit = (teamId, field, value) => {
    setEdits(prev => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || {}),
        [field]: value
      }
    }));
  };

  const getEditValue = (team, field) => {
    if (edits[team.teamId] && edits[team.teamId][field] !== undefined) {
      return edits[team.teamId][field];
    }
    return field === 'cupWins' ? team.cupWins : team.isNewTeam;
  };

  const hasChanges = (team) => {
    const e = edits[team.teamId];
    if (!e) return false;
    if (e.cupWins !== undefined && e.cupWins !== team.cupWins) return true;
    if (e.isNewTeam !== undefined && e.isNewTeam !== team.isNewTeam) return true;
    return false;
  };

  const handleSave = async (team) => {
    const e = edits[team.teamId];
    if (!e) return;

    setSaving(prev => ({ ...prev, [team.teamId]: true }));
    try {
      const body = { teamId: team.teamId };
      if (e.cupWins !== undefined) body.cupWins = parseInt(e.cupWins) || 0;
      if (e.isNewTeam !== undefined) body.isNewTeam = e.isNewTeam;

      const res = await fetch('/api/competition', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setTeams(prev => prev.map(t =>
          t.teamId === team.teamId
            ? { ...t, cupWins: data.team.cup_wins, isNewTeam: data.team.is_new_team }
            : t
        ));
        // Clear edits for this team
        setEdits(prev => {
          const copy = { ...prev };
          delete copy[team.teamId];
          return copy;
        });
        showMessage(`${team.teamName} updated successfully`);
      } else {
        showMessage(`Failed to update ${team.teamName}`, 'error');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showMessage(`Error updating ${team.teamName}`, 'error');
    } finally {
      setSaving(prev => ({ ...prev, [team.teamId]: false }));
    }
  };

  // Collect all unique age groups from teams
  const allAgeGroups = [...new Set(teams.flatMap(t => t.ageGroups || []))].sort((a, b) => {
    const order = { U9: 1, U11: 2, U13: 3, U15: 4, U17: 5, Senior: 6 };
    return (order[a] || 99) - (order[b] || 99);
  });

  const filteredTeams = filterAg === 'all'
    ? teams
    : teams.filter(t => t.ageGroups && t.ageGroups.includes(filterAg));

  return (
    <>
      <Head>
        <title>Competition Management - Admin</title>
      </Head>

      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <header style={{
          background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
          padding: '0.85rem 1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}>
          <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: 'white' }}>🏆 Competition Management</h1>
            <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
              <button
                onClick={loadTeams}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔄 Refresh
              </button>
              <Link href="/admin" style={{ color: 'white', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>
                ← Back to Admin
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
          {message && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              background: messageType === 'error' ? '#fef2f2' : '#e0f2fe',
              border: `1px solid ${messageType === 'error' ? '#fca5a5' : '#7dd3fc'}`,
              borderRadius: '8px',
              color: messageType === 'error' ? '#991b1b' : '#0c4a6e',
              fontWeight: '600'
            }}>
              {message}
            </div>
          )}

          {/* Filter bar */}
          <div style={{
            display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center'
          }}>
            <span style={{ fontWeight: '700', color: '#374151', marginRight: '0.5rem' }}>Filter by Age Group:</span>
            <button
              onClick={() => setFilterAg('all')}
              style={{
                padding: '0.4rem 0.9rem',
                background: filterAg === 'all' ? '#111827' : '#e5e7eb',
                color: filterAg === 'all' ? '#fff' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              All ({teams.length})
            </button>
            {allAgeGroups.map(ag => {
              const count = teams.filter(t => t.ageGroups && t.ageGroups.includes(ag)).length;
              return (
                <button
                  key={ag}
                  onClick={() => setFilterAg(ag)}
                  style={{
                    padding: '0.4rem 0.9rem',
                    background: filterAg === ag ? '#dc0000' : '#e5e7eb',
                    color: filterAg === ag ? '#fff' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {ag} ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              Loading teams...
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Team</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.85rem', color: '#6b7280' }}>Age Groups</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280', width: '140px' }}>Cup Wins</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: '#6b7280', width: '120px' }}>New Team</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.85rem', color: '#6b7280', width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                        No teams found.
                      </td>
                    </tr>
                  )}
                  {filteredTeams.map((team) => (
                    <tr key={team.teamId} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {team.teamLogo ? (
                            <img
                              src={team.teamLogo}
                              alt={team.teamName}
                              style={{
                                width: '40px', height: '40px', borderRadius: '8px',
                                objectFit: 'contain', background: '#f3f4f6', border: '1px solid #e5e7eb'
                              }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{
                              width: '40px', height: '40px', borderRadius: '8px',
                              background: '#f3f4f6', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontWeight: '800', color: '#9ca3af',
                              fontSize: '1.1rem', border: '1px solid #e5e7eb'
                            }}>
                              {team.teamName.charAt(0)}
                            </div>
                          )}
                          <span style={{ fontWeight: '700', color: '#111827' }}>{team.teamName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          {(team.ageGroups || []).sort((a, b) => {
                            const order = { U9: 1, U11: 2, U13: 3, U15: 4, U17: 5, Senior: 6 };
                            return (order[a] || 99) - (order[b] || 99);
                          }).map(ag => (
                            <span key={ag} style={{
                              padding: '0.2rem 0.5rem',
                              background: '#e5e7eb',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: '#374151'
                            }}>{ag}</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          value={getEditValue(team, 'cupWins')}
                          onChange={(e) => handleEdit(team.teamId, 'cupWins', parseInt(e.target.value) || 0)}
                          style={{
                            width: '80px',
                            padding: '0.4rem 0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            textAlign: 'center',
                            fontWeight: '700',
                            background: hasChanges(team) ? '#fef9c3' : '#fff'
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <div
                            onClick={() => handleEdit(team.teamId, 'isNewTeam', !getEditValue(team, 'isNewTeam'))}
                            style={{
                              width: '44px', height: '24px', borderRadius: '12px',
                              background: getEditValue(team, 'isNewTeam') ? '#10b981' : '#d1d5db',
                              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                              border: hasChanges(team) ? '2px solid #f59e0b' : '2px solid transparent'
                            }}
                          >
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '50%',
                              background: 'white', position: 'absolute', top: '1px',
                              left: getEditValue(team, 'isNewTeam') ? '22px' : '2px',
                              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '0.8rem', fontWeight: '600',
                            color: getEditValue(team, 'isNewTeam') ? '#10b981' : '#9ca3af'
                          }}>
                            {getEditValue(team, 'isNewTeam') ? 'Yes' : 'No'}
                          </span>
                        </label>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleSave(team)}
                          disabled={!hasChanges(team) || saving[team.teamId]}
                          style={{
                            padding: '0.4rem 0.75rem',
                            background: !hasChanges(team) ? '#e5e7eb' : saving[team.teamId] ? '#93c5fd' : '#dc0000',
                            color: !hasChanges(team) ? '#9ca3af' : 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: !hasChanges(team) ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {saving[team.teamId] ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
