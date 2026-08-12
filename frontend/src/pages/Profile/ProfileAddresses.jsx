import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog.jsx';
import { addressApi } from '../../services/api.js';
import { Empty, Flash, SectionHead, Skeletons } from './ProfileParts.jsx';

const BLANK = {
  label: 'Home',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  makeDefault: false,
};

const LABELS = ['Home', 'Work', 'Other'];

export default function ProfileAddresses() {
  const { reload: reloadProfile } = useOutletContext();

  const [addresses, setAddresses] = useState(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState(null);
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(
    () =>
      addressApi
        .list()
        .then(setAddresses)
        .catch((err) => {
          setError(err.message);
          setAddresses([]);
        }),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const update = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  function startAdd() {
    setEditingId(null);
    setFieldErrors({});
    setForm({ ...BLANK, makeDefault: (addresses?.length ?? 0) === 0 });
  }

  function startEdit(address) {
    setEditingId(address.id);
    setFieldErrors({});
    setForm({ ...address, makeDefault: address.isDefault, line2: address.line2 || '' });
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setFlash(null);
    try {
      if (editingId) await addressApi.update(editingId, form);
      else await addressApi.add(form);

      await load();
      await reloadProfile();
      setForm(null);
      setEditingId(null);
      setFlash({ tone: 'good', message: editingId ? 'Address updated.' : 'Address saved.' });
    } catch (err) {
      setFieldErrors(err.fields || {});
      setFlash({
        tone: 'bad',
        message: err.fields ? 'Please check the highlighted fields.' : err.message,
      });
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id) {
    setBusy(true);
    try {
      await addressApi.makeDefault(id);
      await load();
      setFlash({ tone: 'good', message: 'Default address changed.' });
    } catch (err) {
      setFlash({ tone: 'bad', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    setBusy(true);
    try {
      await addressApi.remove(target.id);
      await load();
      await reloadProfile();
      setFlash({ tone: 'good', message: 'Address removed. Past orders are unaffected.' });
    } catch (err) {
      setFlash({ tone: 'bad', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (addresses === null) return <Skeletons rows={2} height={140} />;

  return (
    <section className="psec">
      <SectionHead
        title="Saved addresses"
        subtitle="Pick one at checkout instead of typing it again. Past orders keep their own copy."
      >
        {!form && (
          <button type="button" className="psec__ghost" onClick={startAdd}>
            <Icon name="plus" size={16} /> Add address
          </button>
        )}
      </SectionHead>

      <Flash {...flash} onDismiss={() => setFlash(null)} />

      {form && (
        <article className="pcard">
          <h3 className="pcard__title">{editingId ? 'Edit address' : 'New address'}</h3>
          <form className="pform pform--grid" onSubmit={save} noValidate>
            <fieldset className="pform__labels">
              <legend>Label</legend>
              {LABELS.map((label) => (
                <label key={label} className={form.label === label ? 'is-on' : undefined}>
                  <input
                    type="radio"
                    name="label"
                    value={label}
                    checked={form.label === label}
                    onChange={update('label')}
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            <label className="field">
              <span>Full name</span>
              <input type="text" value={form.fullName} onChange={update('fullName')} autoComplete="name" />
              {fieldErrors.fullName && <em role="alert">{fieldErrors.fullName}</em>}
            </label>

            <label className="field">
              <span>Phone</span>
              <input type="tel" inputMode="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" />
              {fieldErrors.phone && <em role="alert">{fieldErrors.phone}</em>}
            </label>

            <label className="field pform__wide">
              <span>Address</span>
              <input
                type="text"
                value={form.line1}
                onChange={update('line1')}
                placeholder="Flat, building, street"
                autoComplete="address-line1"
              />
              {fieldErrors.line1 && <em role="alert">{fieldErrors.line1}</em>}
            </label>

            <label className="field pform__wide">
              <span>Landmark or area (optional)</span>
              <input type="text" value={form.line2} onChange={update('line2')} autoComplete="address-line2" />
            </label>

            <label className="field">
              <span>City</span>
              <input type="text" value={form.city} onChange={update('city')} autoComplete="address-level2" />
              {fieldErrors.city && <em role="alert">{fieldErrors.city}</em>}
            </label>

            <label className="field">
              <span>State</span>
              <input type="text" value={form.state} onChange={update('state')} autoComplete="address-level1" />
              {fieldErrors.state && <em role="alert">{fieldErrors.state}</em>}
            </label>

            <label className="field">
              <span>Pincode</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={update('pincode')}
                autoComplete="postal-code"
              />
              {fieldErrors.pincode && <em role="alert">{fieldErrors.pincode}</em>}
            </label>

            <label className="pform__check pform__wide">
              <input type="checkbox" checked={form.makeDefault} onChange={update('makeDefault')} />
              <span>Use this as my default delivery address</span>
            </label>

            <div className="pform__actions pform__wide">
              <Button type="submit" disabled={busy} icon="check">
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Save address'}
              </Button>
              <button type="button" className="psec__ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        </article>
      )}

      {addresses.length === 0 && !form ? (
        <Empty
          icon="pin"
          title={error ? 'We could not load your addresses' : 'No saved addresses'}
          action={{ label: 'Add your first address', onClick: startAdd }}
        >
          {error || 'Save an address once and the checkout will fill itself in next time.'}
        </Empty>
      ) : (
        <ul className="paddrs">
          {addresses.map((a) => (
            <li key={a.id} className={`pcard paddr-card ${a.isDefault ? 'is-default' : ''}`}>
              <header>
                <span className="paddr-card__label">{a.label}</span>
                {a.isDefault && <span className="psec__pill is-good">Default</span>}
              </header>

              <address className="paddr">
                <strong>{a.fullName}</strong>
                {a.line1}
                {a.line2 && <span>{a.line2}</span>}
                <span>
                  {a.city} {a.pincode}
                </span>
                <span>
                  {a.state}, {a.country}
                </span>
                <span>
                  <Icon name="phone" size={14} /> {a.phone}
                </span>
              </address>

              <footer className="paddr-card__actions">
                <button type="button" className="psec__ghost" onClick={() => startEdit(a)}>
                  <Icon name="edit" size={15} /> Edit
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    className="psec__ghost"
                    onClick={() => makeDefault(a.id)}
                    disabled={busy}
                  >
                    <Icon name="check" size={15} /> Make default
                  </button>
                )}
                <button type="button" className="psec__danger" onClick={() => setRemoving(a)}>
                  <Icon name="trash" size={15} /> Delete
                </button>
              </footer>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Delete this address?"
        message="It will no longer be offered at checkout. Orders already sent to it keep their own copy of the address and are not affected."
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
      />
    </section>
  );
}
