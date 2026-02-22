// Recovery page — reads formDraft_2 from localStorage and re-submits
// to create the missing form_submission + team_player records.
// Users see a simple "recovering your registration" flow.
import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function RecoverRegistration() {
  const [status, setStatus] = useState('checking'); // checking | found | recovering | success | no-data | already-exists | error
  const [message, setMessage] = useState('');
  const [recoveredPlayer, setRecoveredPlayer] = useState('');
  const [recoveredEmail, setRecoveredEmail] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const recover = async () => {
      try {
        // Read formDraft_2 from localStorage
        const savedFormData = localStorage.getItem('formDraft_2');
        if (!savedFormData) {
          setStatus('no-data');
          setMessage('No registration data found in this browser. If you registered on a different device or browser, please open this link there instead.');
          return;
        }

        const parsed = JSON.parse(savedFormData);
        const formData = parsed?.formData || {};
        const cart = parsed?.cart || [];

        const parentEmail = String(formData[38] || formData['38'] || formData.checkout_email || '').trim();
        const parentName = String(formData[37] || formData['37'] || '').trim();
        
        // Get player name from entries
        const entries = formData[45] || formData['45'] || [];
        const playerName = Array.isArray(entries) && entries.length > 0 
          ? entries[0].playerName || 'Unknown' 
          : formData[6] || formData['6'] || 'Unknown';

        setRecoveredPlayer(playerName);
        setRecoveredEmail(parentEmail);

        if (!parentEmail) {
          setStatus('no-data');
          setMessage('Registration data found but no email address detected. Please contact support.');
          return;
        }

        setStatus('found');

        // Check if submission already exists
        const checkRes = await fetch(`/api/form-submissions?formId=2`);
        const checkData = await checkRes.json();
        const submissions = checkData.submissions || checkData || [];
        const existing = Array.isArray(submissions) && submissions.some(s =>
          s.customerEmail === parentEmail ||
          s.customer_email === parentEmail ||
          (s.data && (s.data[38] === parentEmail || s.data['38'] === parentEmail))
        );

        if (existing) {
          setStatus('already-exists');
          setMessage(`Registration for ${parentEmail} already exists. No recovery needed.`);
          // Clear the draft since it's already been processed
          return;
        }

        // Submit the form data to create the missing submission + team_player
        setStatus('recovering');

        const submissionPayload = {
          formId: 2,
          data: formData
        };

        // Include cart items if available
        if (cart && cart.length > 0) {
          submissionPayload.cartItems = cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize || null
          }));
          submissionPayload.cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        } else if (formData._cartItems) {
          submissionPayload.cartItems = formData._cartItems;
          submissionPayload.cartTotal = formData._cartTotal || 0;
        }

        const createRes = await fetch('/api/form-submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionPayload)
        });

        if (createRes.ok) {
          const result = await createRes.json();
          setStatus('success');
          setMessage(`Registration for ${playerName} has been successfully recovered!`);
          
          // Now also update the team_player payment status to match the paid order
          try {
            await fetch('/api/recovery-update-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                email: parentEmail,
                playerName 
              })
            });
          } catch (paymentUpdateError) {
            console.log('Payment status update will be done manually');
          }
        } else {
          const errData = await createRes.json().catch(() => ({}));
          setStatus('error');
          setMessage(`Recovery failed: ${errData.error || 'Unknown error'}. Please contact support.`);
        }
      } catch (e) {
        console.error('Recovery error:', e);
        setStatus('error');
        setMessage(`An error occurred during recovery: ${e.message}. Please contact support.`);
      }
    };

    // Small delay so the user sees the checking state
    const timer = setTimeout(recover, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Recover Registration | Winter League Cricket</title>
      </Head>
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0b0f16',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          color: '#fff'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '8px', color: '#fff' }}>
            Registration Recovery
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '32px' }}>
            Winter League Cricket
          </p>

          {status === 'checking' && (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>Checking for registration data...</p>
            </div>
          )}

          {status === 'found' && (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                Found registration data for <strong>{recoveredPlayer}</strong>
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                Checking if recovery is needed...
              </p>
            </div>
          )}

          {status === 'recovering' && (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>⚙️</div>
              <p style={{ color: '#f59e0b' }}>
                Recovering registration for <strong>{recoveredPlayer}</strong>...
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                Please do not close this page.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '18px' }}>
                {message}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '12px' }}>
                Your registration has been fully restored including team assignment, sizes, and all details.
                You can close this page.
              </p>
            </div>
          )}

          {status === 'already-exists' && (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <p style={{ color: '#22c55e' }}>{message}</p>
            </div>
          )}

          {status === 'no-data' && (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <p style={{ color: '#f59e0b' }}>{message}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '12px' }}>
                Please contact us at winterleaguecricket@gmail.com for assistance.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
              <p style={{ color: '#ef4444' }}>{message}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '12px' }}>
                Please contact us at winterleaguecricket@gmail.com for assistance.
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
