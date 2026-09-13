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
        
        {message && <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success-green)', borderRadius: '12px', marginBottom: '16px' }}>{message}</div>}
        {error && <div style={{ padding: '12px', background: 'rgba(255, 82, 56, 0.2)', color: 'var(--accent-coral)', borderRadius: '12px', marginBottom: '16px' }}>{error}</div>}

        <form onSubmit={handleAddDriver}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Driver ID (Unique)</label>
            <input required value={newDriver.driverId} onChange={e => setNewDriver({...newDriver, driverId: e.target.value})} className="glass-input" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Name</label>
            <input required value={newDriver.name} onChange={e => setNewDriver({...newDriver, name: e.target.value})} className="glass-input" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Address</label>
            <input required value={newDriver.address} onChange={e => setNewDriver({...newDriver, address: e.target.value})} className="glass-input" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Personal Contact</label>
            <input required value={newDriver.personalContact} onChange={e => setNewDriver({...newDriver, personalContact: e.target.value})} className="glass-input" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Emergency Contact</label>
            <input required value={newDriver.parentContact} onChange={e => setNewDriver({...newDriver, parentContact: e.target.value})} className="glass-input" style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={newDriver.hasLicence} onChange={e => setNewDriver({...newDriver, hasLicence: e.target.checked})} style={{ marginRight: '8px' }} />
              Has Valid Licence
            </label>
          </div>
          <div>
            <button type="submit" disabled={isAdding} className="action-btn primary" style={{ width: '100%', justifyContent: 'center' }}>
              {isAdding ? 'Adding Driver...' : 'Register Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
