import React, { useState } from 'react';
import { addDriver } from '../../api/client';

export default function AddDriver() {
  const [newDriver, setNewDriver] = useState({
    driverId: '',
    name: '',
    address: '',
    personalContact: '',
    parentContact: '',
    hasLicence: true
  });
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleAddDriver = async (e) => {
    e.preventDefault();
    setIsAdding(true);
    setMessage(null);
    setError(null);
    try {
      await addDriver(newDriver);
      setMessage(`Driver ${newDriver.driverId} added successfully!`);
      setNewDriver({
        driverId: '', name: '', address: '', personalContact: '', parentContact: '', hasLicence: true
      });
    } catch (err) {
      console.error(err);
      setError("Failed to add driver. Check console for details.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="main-content">
      <div className="header">
        <h1>Add New Driver</h1>
      </div>
      
      <div className="glass-panel" style={{ maxWidth: '600px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '1.2rem' }}>Driver Registration Form</h2>
        
        {message && <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', borderRadius: '6px', marginBottom: '16px' }}>{message}</div>}
        {error && <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '6px', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleAddDriver}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Driver ID (Unique)</label>
            <input required value={newDriver.driverId} onChange={e => setNewDriver({...newDriver, driverId: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: '#fff' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Name</label>
            <input required value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: '#fff' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Address</label>
            <input required value={newDriver.address} onChange={e => setNewDriver({...newDriver, address: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: '#fff' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Personal Contact</label>
            <input required value={newDriver.personalContact} onChange={e => setNewDriver({...newDriver, personalContact: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: '#fff' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Emergency Contact</label>
            <input required value={newDriver.parentContact} onChange={e => setNewDriver({...newDriver, parentContact: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-tertiary)', color: '#fff' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={newDriver.hasLicence} onChange={e => setNewDriver({...newDriver, hasLicence: e.target.checked})} style={{ marginRight: '8px' }} />
              Has Valid Licence
            </label>
          </div>
          <div>
            <button type="submit" disabled={isAdding} style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', opacity: isAdding ? 0.7 : 1, width: '100%', fontWeight: '600' }}>
              {isAdding ? 'Adding Driver...' : 'Register Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
