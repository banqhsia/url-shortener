import { useState } from 'react';

/**
 * Manages form state with error and saving flags.
 *
 * Returns:
 *   form         - current field values
 *   setForm      - override form values (useful when loading initial data from API)
 *   handleChange - generic onChange for name-based inputs
 *   handleSubmit - higher-order fn: pass your async submit callback, get an onSubmit handler back
 *   error        - error message string (set from catch)
 *   setError     - override error manually (e.g. for field-level validation)
 *   saving       - true while submit is in flight
 *
 * Usage:
 *   const { form, handleChange, handleSubmit, error, saving } = useForm({ name: '' });
 *   <form onSubmit={handleSubmit(async (f) => { await api.post(f); navigate('/'); })}>
 */
export function useForm(initialValues) {
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(onSubmit) {
    return async (e) => {
      e.preventDefault();
      setSaving(true);
      setError('');
      try {
        await onSubmit(form);
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'An error occurred');
      } finally {
        setSaving(false);
      }
    };
  }

  return { form, setForm, handleChange, handleSubmit, error, setError, saving };
}
