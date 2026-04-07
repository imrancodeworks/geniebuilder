import { useState, useEffect } from 'react';
import { ThemeToggle } from '../components/shared';
import UserMenu from '../components/UserMenu';
import { useApp } from '../context/AppContext';
import API_BASE_URL from '../config';

export default function ResumeReader({ onHome, onProfile, onLogout }) {
  const { theme, toggleTheme, token, logout } = useApp();
  const [activeTab, setActiveTab] = useState('setup'); // 'setup', 'match'
  
  // JD State
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [hasJd, setHasJd] = useState(false);
  const [jdDetails, setJdDetails] = useState(null);
  const [savedJds, setSavedJds] = useState([]);
  
  // Candidates
  const [candidates, setCandidates] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Matching
  const [matchResults, setMatchResults] = useState(null);
  const [matching, setMatching] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Status
  const [message, setMessage] = useState('');

  const API_URL = API_BASE_URL;

  useEffect(() => {
    if (token) {
      fetchCandidates(true);
      fetchJds();
    }
  }, [token]);

  const authFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      logout();
      return null;
    }
    return res;
  };

  const fetchCandidates = async (reset = false) => {
    try {
      const currentSkip = reset ? 0 : skip;
      const res = await authFetch(`${API_URL}/api/candidates?skip=${currentSkip}&limit=10`);
      if (res && res.ok) {
        const data = await res.json();
        if (reset) {
          setCandidates(data.candidates || []);
          setSkip(10);
        } else {
          setCandidates(prev => [...prev, ...(data.candidates || [])]);
          setSkip(prev => prev + 10);
        }
        setHasMore(data.candidates?.length === 10);
      }
    } catch (e) { console.error('Failed to fetch candidates', e); }
  };

  const fetchJds = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/jds`);
      if (res && res.ok) {
        const data = await res.json();
        setSavedJds(data.job_descriptions || []);
        if (data.job_descriptions?.length > 0 && !hasJd) {
          selectJd(data.job_descriptions[0]);
        }
      }
    } catch (e) { console.error('Failed to fetch JDs', e); }
  };

  const selectJd = (jd) => {
    setJobTitle(jd.title);
    setCompany(jd.company || '');
    setHasJd(true);
    setJdDetails(jd);
  };

  const handleJdSubmit = async (e) => {
    e.preventDefault();
    if (!jobDesc || jobDesc.length < 50) return alert('JD too short. Must be at least 50 characters.');
    try {
      const res = await authFetch(`${API_URL}/api/job-description`, {
        method: 'POST',
        body: JSON.stringify({ title: jobTitle, company, description: jobDesc })
      });
      if (res && res.ok) {
        const data = await res.json();
        setHasJd(true);
        setJdDetails(data);
        setJobDesc('');
        setMessage('Job Description successfully saved!');
        fetchJds();
        setTimeout(() => setMessage(''), 4000);
      } else if (res) {
        const error = await res.json();
        alert(error.detail || 'Failed to submit JD');
      }
    } catch (e) { alert('Could not reach backend API at ' + API_URL); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authFetch(`${API_URL}/api/upload-resume`, {
        method: 'POST',
        body: formData
      });
      if (res && res.ok) {
        setSkip(0);
        await fetchCandidates(true);
      } else if (res) {
        const error = await res.json();
        alert(error.detail || 'Upload failed');
      }
    } catch (e) {
      alert('Could not reach backend API at ' + API_URL);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleDeleteCandidate = async (id) => {
    try {
      const res = await authFetch(`${API_URL}/api/candidate/${id}`, { method: 'DELETE' });
      if (res && res.ok) {
        fetchCandidates(true);
      }
    } catch (e) { console.error(e); }
  };

  const handleMatch = async () => {
    if (!hasJd) return alert('Load a Job Description first!');
    if (candidates.length === 0) return alert('Upload at least one resume before matching.');
    
    setMatching(true);
    setActiveTab('match');
    try {
      const res = await authFetch(`${API_URL}/api/match`, {
        method: 'POST',
        body: JSON.stringify({ jd_id: jdDetails.id })
      });
      if (res && res.ok) {
        const data = await res.json();
        setMatchResults(data);
      } else if (res) {
        const error = await res.json();
        alert(error.detail || 'Match failed');
        setActiveTab('setup');
      }
    } catch (e) {
      alert('Could not reach backend API.');
      setActiveTab('setup');
    } finally {
      setMatching(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!jdDetails) return;
    setExporting(true);
    try {
      const res = await authFetch(`${API_URL}/api/candidates/export?jd_id=${jdDetails.id}`);
      if (res && res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Ranking_Report_${jdDetails.title.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) { console.error('Export failed', e); }
    finally { setExporting(false); }
  };

  const getGradeColor = (grade) => {
    if (grade === 'Excellent') return 'var(--success)';
    if (grade === 'Good') return 'var(--accent-a)';
    if (grade === 'Fair') return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: theme === 'light'
          ? 'radial-gradient(ellipse at 20% 20%, rgba(155,142,199,0.10) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(180,211,217,0.12) 0%, transparent 55%)'
          : 'radial-gradient(ellipse at 20% 20%, rgba(212,168,67,0.07) 0%, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(196,149,74,0.07) 0%, transparent 55%)',
      }} />

      {/* Nav */}
      <nav className="resp-nav" style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60, backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="float-anim" style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--accent-a)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16,
            boxShadow: '0 4px 14px var(--glow-a)',
          }}>◈</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>GenieBuilder HR</span>
        </div>
        <div className="resp-wrap" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="nav-btn" onClick={onHome} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 14, padding: '6px 12px', borderRadius: 8,
          }}>Dashboard</button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <div style={{ marginLeft: '12px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
            <UserMenu onProfile={onProfile} onLogout={onLogout} />
          </div>
        </div>
      </nav>
      <style>{`
        @media (max-width: 768px) {
          .reader-header { flex-direction: column; align-items: stretch !important; }
          .reader-tabs { width: 100%; justify-content: stretch; overflow-x: auto; flex-wrap: nowrap !important; }
          .reader-tabs button { flex-shrink: 0; white-space: nowrap; }
          .match-card-header { flex-direction: column; align-items: center !important; text-align: center; gap: 16px; }
          .match-details-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px', position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease' }}>
        
        <div className="reader-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 20 }}>
          <div>
            <button 
              onClick={onHome}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--accent-a)', fontSize: 14, fontWeight: 600,
                marginBottom: 16, padding: 0, transition: 'all .2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.7'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              ← Back to Dashboard
            </button>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>

              Resume Reader
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
              AI-Powered Candidate Screening against Job Descriptions
            </p>
          </div>
          <div className="reader-tabs" style={{ display: 'flex', gap: 12, background: 'var(--bg-card)', padding: '6px', borderRadius: 12, border: '1px solid var(--border)' }}>
            <button onClick={() => setActiveTab('setup')} style={{
              background: activeTab === 'setup' ? 'var(--accent-a-dim)' : 'transparent',
              color: activeTab === 'setup' ? 'var(--accent-a)' : 'var(--text-muted)',
              border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all .2s'
            }}>1. Setup & Upload</button>
            <button onClick={handleMatch} disabled={!hasJd || candidates.length === 0} style={{
              background: activeTab === 'match' ? 'var(--accent-a-dim)' : 'transparent',
              color: activeTab === 'match' ? 'var(--accent-a)' : 'var(--text-muted)',
              border: 'none', padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, 
              cursor: (!hasJd || candidates.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (!hasJd || candidates.length === 0) ? 0.5 : 1, transition: 'all .2s'
            }}>2. View Matches</button>
          </div>
        </div>

        {message && (
          <div style={{ background: 'var(--success-dim)', color: 'var(--success)', padding: '12px 20px', borderRadius: 10, border: '1px solid var(--success)', marginBottom: 24 }}>
            ✓ {message}
          </div>
        )}

        {/* SETUP TAB */}
        {activeTab === 'setup' && (
          <div className="resp-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, animation: 'fadeIn .3s ease' }}>
            
            {/* Left: Job Description Form */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>Job Target {hasJd ? '✓' : ''}</h2>
                {savedJds.length > 0 && (
                  <select 
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, padding: '4px 8px' }}
                    onChange={(e) => {
                      const selected = savedJds.find(j => j.id === e.target.value);
                      if (selected) selectJd(selected);
                    }}
                    value={jdDetails?.id || ''}
                  >
                    <option value="" disabled>Saved History</option>
                    {savedJds.map(jd => (
                      <option key={jd.id} value={jd.id}>{jd.title}</option>
                    ))}
                  </select>
                )}
              </div>
              
              <form onSubmit={handleJdSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Job Title</label>
                  <input required value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Company (Optional)</label>
                  <input value={company} onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Google"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Paste Full Job Description</label>
                  <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)}
                    placeholder={hasJd ? "Enter new details to overwrite current JD..." : "Paste at least 50 characters..."}
                    style={{ width: '100%', height: 160, padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                </div>
                
                <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: 10, fontSize: 15, fontWeight: 600, border: 'none', background: 'var(--accent-a)', color: '#fff', cursor: 'pointer' }}>
                  {hasJd ? 'Update/New Job Description' : 'Save Job Description'}
                </button>
              </form>

              {jdDetails && (
                <div style={{ marginTop: 24, padding: '16px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-a)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: 1 }}>PARSED REQUIREMENTS</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>Required Skills: <strong>{jdDetails.required_skills_count}</strong></div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>Preferred Skills: <strong>{jdDetails.preferred_skills_count}</strong></div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)'}}>Min Experience: <strong>{jdDetails.min_years_experience} years</strong></div>
                </div>
              )}
            </div>

            {/* Right: Resumes Upload */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: 18, color: 'var(--text-primary)', margin: '0 0 20px 0' }}>Candidates ({candidates.length})</h2>
              
              <label style={{
                border: '2px dashed var(--border-strong)', borderRadius: 14, padding: '32px 20px', textAlign: 'center',
                background: 'var(--bg-surface)', cursor: 'pointer', transition: 'all .2s', display: 'block', marginBottom: 24
              }}>
                <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
                <div style={{ fontSize: 32, marginBottom: 12 }}>{uploading ? '⏳' : '📄'}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-a)', marginBottom: 4 }}>
                  {uploading ? 'Processing OCR...' : 'Click to Upload Resume'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports PDF/Image-PDFs, DOCX, TXT</div>
              </label>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
                {candidates.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginTop: 20 }}>No candidates uploaded yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {candidates.map(c => (
                      <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 10 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {c.name || c.filename}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {c.experience_years}y exp · {c.skills_count} skills
                          </div>
                        </div>
                        <button onClick={() => handleDeleteCandidate(c.id)} title="Remove candidate" style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 18, cursor: 'pointer', padding: '0 0 0 10px', opacity: 0.6 }}>×</button>
                      </div>
                    ))}
                    {hasMore && (
                      <button onClick={() => fetchCandidates()} className="btn-ghost" style={{ fontSize: 13, color: 'var(--accent-a)', padding: '10px' }}>Load More...</button>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MATCH TAB */}
        {activeTab === 'match' && (
          <div style={{ animation: 'fadeIn .3s ease' }}>
            {matching ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>⚙️</div>
                <h3 style={{ color: 'var(--accent-a)' }}>Running NLP Matching Engine...</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Comparing {candidates.length} candidate(s) against the Job Description.</p>
              </div>
            ) : matchResults ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    Ranked against: <strong style={{ color: 'var(--text-primary)' }}>{matchResults.job_title}</strong> {matchResults.company && `at ${matchResults.company}`}
                  </div>
                  <button 
                    onClick={handleDownloadReport} 
                    disabled={exporting}
                    className="btn-primary" 
                    style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'center', background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    {exporting ? 'Generating...' : '📥 Download PDF Report'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {matchResults.results.map((r, i) => (
                    <div key={r.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 6, background: getGradeColor(r.grade) }} />
                      
                      <div className="match-card-header" style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Rank Badge */}
                        <div style={{ textAlign: 'center', minWidth: 60 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>RANK</div>
                          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>#{r.rank}</div>
                        </div>

                        {/* Core Info */}
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <h3 style={{ margin: '0 0 6px 0', fontSize: 20, color: 'var(--text-primary)' }}>{r.name || r.filename}</h3>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
                            <span>📧 {r.email || 'No email found'}</span>
                            <span>💼 {r.experience_years} years exp.</span>
                            <span>🎓 {r.education_level || 'Unknown edu'}</span>
                          </div>
                        </div>

                        {/* Circular Score */}
                        <div style={{
                          width: 80, height: 80, borderRadius: '50%', border: `4px solid ${getGradeColor(r.grade)}`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          background: `${getGradeColor(r.grade)}15`
                        }}>
                          <span style={{ fontSize: 22, fontWeight: 700, color: getGradeColor(r.grade), lineHeight: 1 }}>{r.total_score}</span>
                          <span style={{ fontSize: 11, color: getGradeColor(r.grade), fontWeight: 600 }}>{r.grade}</span>
                        </div>
                      </div>

                      {/* Details / Gaps */}
                      <div className="match-details-grid" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed var(--border)', display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: 24 }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--success)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: 1 }}>✓ MATCHED SKILLS ({r.matched_skills.length})</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {r.matched_skills.slice(0, 10).map(s => (
                              <span key={s} style={{ background: 'var(--success-dim)', color: 'var(--success)', padding: '3px 8px', borderRadius: 4, fontSize: 12 }}>{s}</span>
                            ))}
                            {r.matched_skills.length > 10 && <span style={{ fontSize: 12, color: 'var(--text-muted)', margin: 'auto 0' }}>+{r.matched_skills.length - 10} more</span>}
                            {r.matched_skills.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None found</span>}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--warning)', fontFamily: 'var(--font-mono)', marginBottom: 8, letterSpacing: 1 }}>⚠ MISSING SKILLS ({r.missing_skills.length})</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {r.missing_skills.slice(0, 10).map(s => (
                              <span key={s} style={{ background: 'var(--warning-dim)', color: 'var(--warning)', padding: '3px 8px', borderRadius: 4, fontSize: 12 }}>{s}</span>
                            ))}
                            {r.missing_skills.length > 10 && <span style={{ fontSize: 12, color: 'var(--text-muted)', margin: 'auto 0' }}>+{r.missing_skills.length - 10} more</span>}
                            {r.missing_skills.length === 0 && <span style={{ fontSize: 12, color: 'var(--success)' }}>All required skills met!</span>}
                          </div>
                        </div>
                      </div>
                      
                      {r.gaps.length > 0 && (
                        <div style={{ marginTop: 16, background: 'var(--danger-dim)', padding: '12px 16px', borderRadius: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginBottom: 4 }}>RED FLAGS / GAPS</div>
                          {r.gaps.map((gap, j) => <div key={j} style={{ fontSize: 12, color: 'var(--danger)' }}>• {gap.message}</div>)}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.5 }}>
                    <div style={{ fontSize: 48, marginBottom: 20 }}>📊</div>
                    <p>No matches to show. Go to <strong>Setup & Upload</strong> to begin.</p>
                </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
